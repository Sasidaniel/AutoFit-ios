import UIKit
import Capacitor
import UniformTypeIdentifiers

private class WorkoutShareItem: NSObject, UIActivityItemSource {
    let url: URL
    init(url: URL) { self.url = url }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any {
        return url
    }

    func activityViewController(_ activityViewController: UIActivityViewController,
                                itemForActivityType activityType: UIActivity.ActivityType?) -> Any? {
        return url
    }

    func activityViewController(_ activityViewController: UIActivityViewController,
                                dataTypeIdentifierForActivityType activityType: UIActivity.ActivityType?) -> String {
        switch url.pathExtension.lowercased() {
        case "pdf": return UTType.pdf.identifier
        case "json": return UTType.json.identifier
        default: return UTType.png.identifier
        }
    }
}

@objc(ShareBridgePlugin)
public class ShareBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ShareBridgePlugin"
    public let jsName = "ShareBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareFiles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "eraseTemporaryFiles", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareFile(_ call: CAPPluginCall) {
        prepareFiles([["filename": call.getString("filename") ?? "",
                       "base64": call.getString("base64") ?? ""]], call: call)
    }

    @objc func shareFiles(_ call: CAPPluginCall) {
        guard let items = call.getArray("files") as? [[String: Any]], !items.isEmpty else {
            call.reject("No files to share")
            return
        }
        prepareFiles(items, call: call)
    }

    private func prepareFiles(_ items: [[String: Any]], call: CAPPluginCall) {
        var files: [(String, Data)] = []
        var filenames = Set<String>()
        for item in items {
            guard let filename = item["filename"] as? String,
                  filename == (filename as NSString).lastPathComponent,
                  ["pdf", "png", "json"].contains((filename as NSString).pathExtension.lowercased()),
                  filenames.insert(filename).inserted,
                  let base64 = item["base64"] as? String,
                  let data = Data(base64Encoded: base64), !data.isEmpty else {
                call.reject("Invalid file or unsupported file type")
                return
            }
            files.append((filename, data))
        }
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController,
                  presenter.viewIfLoaded?.window != nil,
                  presenter.presentedViewController == nil else {
                call.reject("Cannot present the share sheet right now")
                return
            }
            let root = FileManager.default.temporaryDirectory.appendingPathComponent("AutoFitShare", isDirectory: true)
            self.removeExpiredShares(in: root)
            let directory = root.appendingPathComponent(UUID().uuidString, isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                var sources: [WorkoutShareItem] = []
                for (filename, data) in files {
                    let url = directory.appendingPathComponent(filename)
                    try data.write(to: url, options: .atomic)
                    sources.append(WorkoutShareItem(url: url))
                }
                let sheet = UIActivityViewController(activityItems: sources, applicationActivities: nil)
                sheet.popoverPresentationController?.sourceView = presenter.view
                sheet.popoverPresentationController?.sourceRect = CGRect(
                    x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1
                )
                sheet.completionWithItemsHandler = { _, completed, _, error in
                    // Some extensions keep reading after the completion callback.
                    // Retain shared URLs briefly; the next share clears expired files.
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

    private func removeExpiredShares(in root: URL) {
        guard FileManager.default.fileExists(atPath: root.path) else { return }
        do {
            let directories = try FileManager.default.contentsOfDirectory(
                at: root, includingPropertiesForKeys: [.creationDateKey, .isDirectoryKey])
            for directory in directories where UUID(uuidString: directory.lastPathComponent) != nil {
                let values = try directory.resourceValues(forKeys: [.creationDateKey, .isDirectoryKey])
                if values.isDirectory == true, let created = values.creationDate,
                   Date().timeIntervalSince(created) > 86400 {
                    removeTemporaryDirectory(directory)
                }

            }
        } catch {
            CAPLog.print("AutoFit: expired share cleanup failed: \(error.localizedDescription)")
        }
    }

    @objc func eraseTemporaryFiles(_ call: CAPPluginCall) {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("AutoFitShare", isDirectory: true)
        do {
            if FileManager.default.fileExists(atPath: root.path) {
                try FileManager.default.removeItem(at: root)
            }
            call.resolve(["cleared": true])
        } catch {
            call.reject("Temporary export deletion failed: \(error.localizedDescription)")
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
