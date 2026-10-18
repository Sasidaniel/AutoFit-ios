import UIKit
import Capacitor

@objc(ShareBridgePlugin)
public class ShareBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareBridgePlugin"
    public let jsName = "ShareBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareFile(_ call: CAPPluginCall) {
        guard let filename = call.getString("filename"),
              filename == (filename as NSString).lastPathComponent,
              ["pdf", "png"].contains((filename as NSString).pathExtension.lowercased()),
              let base64 = call.getString("base64"),
              let data = Data(base64Encoded: base64), !data.isEmpty else {
            call.reject("Invalid file or unsupported file type")
            return
        }

        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil,
                  presenter.presentedViewController == nil else {
                call.reject("Cannot present the share sheet right now")
                return
            }
            let directory = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString, isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                let url = directory.appendingPathComponent(filename)
                try data.write(to: url, options: .atomic)
                let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                sheet.popoverPresentationController?.sourceView = presenter.view
                sheet.popoverPresentationController?.sourceRect = CGRect(
                    x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1
                )
                sheet.completionWithItemsHandler = { _, completed, _, error in
                    self.removeTemporaryDirectory(directory)
                    if let error = error {
                        call.reject("File sharing failed: \(error.localizedDescription)")
                    } else {
                        call.resolve(["shared": completed, "cancelled": !completed])
                    }
                }
                presenter.present(sheet, animated: true)
            } catch {
                self.removeTemporaryDirectory(directory)
                call.reject("Cannot prepare file for sharing: \(error.localizedDescription)")
            }
        }
    }

    private func removeTemporaryDirectory(_ directory: URL) {
        guard FileManager.default.fileExists(atPath: directory.path) else { return }
        do {
            try FileManager.default.removeItem(at: directory)
        } catch {
            CAPLog.print("AutoFit: share file cleanup failed: \(error.localizedDescription)")
        }
    }
}
