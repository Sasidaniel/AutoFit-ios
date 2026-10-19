import Foundation

struct ScheduledWorkoutAnnouncement {
    let text: String
    let identifier: String
    let fireDate: Date
    let language: String

    init(_ item: [String: Any]) throws {
        guard let text = item["text"] as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              let identifier = item["announcementID"] as? String, !identifier.isEmpty,
              let millis = item["fireAtMillis"] as? Double, millis.isFinite, millis > 0 else {
            throw NSError(domain: "AutoFit.Announcements", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Invalid announcement text, identifier or deadline"])
        }
        guard let language = (item["language"] ?? "he-IL") as? String,
              ["he-IL", "en-US"].contains(language) else {
            throw NSError(domain: "AutoFit.Announcements", code: 2,
                userInfo: [NSLocalizedDescriptionKey: "Unsupported announcement language"])
        }
        self.language = language
        self.text = text
        self.identifier = identifier
        self.fireDate = Date(timeIntervalSince1970: millis / 1000)
    }

    func timer(_ callback: @escaping (Timer) -> Void) -> Timer {
        Timer(fire: fireDate, interval: 0, repeats: false, block: callback)
    }
}
