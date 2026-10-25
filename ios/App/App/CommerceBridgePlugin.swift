import Foundation
import Capacitor
import StoreKit

@objc(CommerceBridgePlugin)
public class CommerceBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CommerceBridgePlugin"
    public let jsName = "CommerceBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "manage", returnType: CAPPluginReturnPromise)
    ]

    private var transactionUpdates: Task<Void, Never>?
    private var purchaseInProgress = false
    private var restoreInProgress = false

    private var productIDs: Set<String> {
        let values = Bundle.main.object(forInfoDictionaryKey: "AutoFitSubscriptionProductIDs") as? [String] ?? []
        guard !values.isEmpty, values.count <= 2,
              values.allSatisfy({ !$0.isEmpty && $0.count <= 200 && $0 == $0.trimmingCharacters(in: .whitespacesAndNewlines) }),
              Set(values).count == values.count else { return [] }
        return Set(values)
    }

    private var policyVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "AutoFitCommercePolicyVersion") as? String ?? ""
    }

    private var purchasesEnabled: Bool {
        Bundle.main.object(forInfoDictionaryKey: "AutoFitCommerceEnabled") as? Bool == true
            && !productIDs.isEmpty && !policyVersion.isEmpty
            && !policyVersion.lowercased().contains("draft")
    }

    public override func load() {
        transactionUpdates = Task { @MainActor [weak self] in
            for await result in Transaction.updates {
                guard let self, !Task.isCancelled else { return }
                do {
                    let transaction = try self.verified(result)
                    guard self.productIDs.contains(transaction.productID) else { continue }
                    let state = try await self.snapshot()
                    self.notifyListeners("entitlementsChanged", data: state)
                    await transaction.finish()
                } catch {
                    self.notifyListeners("commerceError", data: ["code": "TRANSACTION_VERIFICATION_FAILED"])
                }
            }
        }
    }

    deinit {
        transactionUpdates?.cancel()
    }

    private func verified<T: Sendable>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified:
            throw NSError(domain: "AutoFitCommerce", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Apple transaction verification failed"])
        }
    }

    private func period(_ value: Product.SubscriptionPeriod) -> [String: Any] {
        let unit: String
        switch value.unit {
        case .day: unit = "day"
        case .week: unit = "week"
        case .month: unit = "month"
        case .year: unit = "year"
        @unknown default: unit = "unknown"
        }
        return ["value": value.value, "unit": unit]
    }

    private func configuredProducts() async throws -> [Product] {
        let products = try await Product.products(for: productIDs)
        guard products.count == productIDs.count, products.allSatisfy({ $0.type == .autoRenewable }),
              Set(products.compactMap({ $0.subscription?.subscriptionGroupID })).count == 1 else {
            throw NSError(domain: "AutoFitCommerce", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "Configured subscriptions are unavailable in this storefront"])
        }
        return products
    }

    private func snapshot() async throws -> [String: Any] {
        let ids = productIDs
        guard !ids.isEmpty else {
            return ["configured": false, "enabled": false, "verified": false,
                    "products": [], "entitlements": [], "canMakePayments": false]
        }
        let products = try await configuredProducts()
        var rows: [[String: Any]] = []
        for product in products.sorted(by: { $0.id < $1.id }) {
            guard let subscription = product.subscription else { continue }
            var row: [String: Any] = [
                "id": product.id, "name": product.displayName, "description": product.description,
                "price": product.displayPrice, "period": period(subscription.subscriptionPeriod)
            ]
            if let offer = subscription.introductoryOffer, offer.paymentMode == .freeTrial,
               await subscription.isEligibleForIntroOffer {
                row["freeTrial"] = ["period": period(offer.period), "periodCount": offer.periodCount]
            }
            rows.append(row)
        }
        var entitlements: [[String: Any]] = []
        // Apple's current-entitlement sequence includes an eligible billing grace period.
        // Do not replace it with an expiry-only check that locks out that customer.
        for await result in Transaction.currentEntitlements {
            let transaction = try verified(result)
            guard ids.contains(transaction.productID), transaction.revocationDate == nil,
                  !transaction.isUpgraded, transaction.productType == .autoRenewable else { continue }
            var entitlement: [String: Any] = ["productID": transaction.productID]
            if let expires = transaction.expirationDate {
                entitlement["expirationMillis"] = expires.timeIntervalSince1970 * 1000
            }
            entitlements.append(entitlement)
        }
        return ["configured": true, "enabled": purchasesEnabled, "verified": true,
                "products": rows, "entitlements": entitlements,
                "canMakePayments": AppStore.canMakePayments, "policyVersion": policyVersion]
    }

    @objc func status(_ call: CAPPluginCall) {
        Task { @MainActor in
            do { call.resolve(try await self.snapshot()) }
            catch { call.reject("Apple subscription status could not be verified", "COMMERCE_STATUS_FAILED", error) }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard self.purchasesEnabled,
                  call.getString("policyVersion") == self.policyVersion,
                  let id = call.getString("productID"), self.productIDs.contains(id) else {
                call.reject("Commercial purchases have not been approved and configured", "COMMERCE_DISABLED")
                return
            }
            guard !self.purchaseInProgress, !self.restoreInProgress else {
                call.reject("Another Apple purchase operation is in progress", "COMMERCE_BUSY")
                return
            }
            guard AppStore.canMakePayments else {
                call.reject("Apple purchases are not permitted on this device", "PAYMENTS_NOT_ALLOWED")
                return
            }
            self.purchaseInProgress = true
            defer { self.purchaseInProgress = false }
            do {
                guard let product = try await self.configuredProducts().first(where: { $0.id == id }),
                      product.type == .autoRenewable else {
                    call.reject("This subscription is unavailable", "PRODUCT_UNAVAILABLE")
                    return
                }
                switch try await product.purchase() {
                case .success(let result):
                    let transaction = try self.verified(result)
                    guard transaction.productID == id, transaction.revocationDate == nil else {
                        call.reject("Apple returned an unexpected transaction", "TRANSACTION_VERIFICATION_FAILED")
                        return
                    }
                    let state = try await self.snapshot()
                    await transaction.finish()
                    call.resolve(["state": "verified", "status": state])
                    self.notifyListeners("entitlementsChanged", data: state)
                case .pending:
                    call.resolve(["state": "pending"])
                case .userCancelled:
                    call.resolve(["state": "cancelled"])
                @unknown default:
                    call.reject("Unknown Apple purchase result", "PURCHASE_RESULT_UNKNOWN")
                }
            } catch {
                call.reject("Apple purchase did not complete or could not be verified", "PURCHASE_FAILED", error)
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !self.productIDs.isEmpty else {
                call.reject("Subscription products have not been configured", "COMMERCE_NOT_CONFIGURED")
                return
            }
            guard !self.purchaseInProgress, !self.restoreInProgress else {
                call.reject("Another Apple purchase operation is in progress", "COMMERCE_BUSY")
                return
            }
            self.restoreInProgress = true
            defer { self.restoreInProgress = false }
            do {
                try await AppStore.sync()
                let state = try await self.snapshot()
                call.resolve(state)
                self.notifyListeners("entitlementsChanged", data: state)
            } catch {
                call.reject("Apple purchase restoration did not complete", "RESTORE_FAILED", error)
            }
        }
    }

    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else {
                call.reject("No active window is available", "NO_ACTIVE_WINDOW")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve(["opened": true])
            } catch {
                call.reject("Apple subscription management did not open", "MANAGE_FAILED", error)
            }
        }
    }
}
