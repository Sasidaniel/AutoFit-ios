import Foundation

@main
struct ScheduledWorkoutAnnouncementTests {
    static func main() throws {
        let now = Date().timeIntervalSince1970 * 1000
        let item: [String: Any] = [
            "text": "Rest finished", "announcementID": "rest:done", "fireAtMillis": now + 90000
        ]
        let announcement = try ScheduledWorkoutAnnouncement(item)
        let timer = announcement.timer { _ in }
        precondition(announcement.identifier == "rest:done")
        precondition(abs(timer.fireDate.timeIntervalSince1970 * 1000 - (now + 90000)) < 0.001)
        // Crossing the bridge later must not move the actual deadline.
        Thread.sleep(forTimeInterval: 0.02)
        let delayed = try ScheduledWorkoutAnnouncement(item)
        precondition(delayed.timer { _ in }.fireDate == timer.fireDate)
        timer.invalidate()

        let overdue = try ScheduledWorkoutAnnouncement([
            "text": "Done", "announcementID": "overdue", "fireAtMillis": now - 1000
        ])
        let dueTimer = overdue.timer { _ in }
        precondition(dueTimer.fireDate < Date())
        RunLoop.current.add(dueTimer, forMode: .default)
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        precondition(!dueTimer.isValid)

        for invalid in [
            ["text": "", "announcementID": "id", "fireAtMillis": now],
            ["text": "  ", "announcementID": "id", "fireAtMillis": now],
            ["text": "Done", "announcementID": "", "fireAtMillis": now],
            ["text": "Done", "announcementID": "id", "fireAtMillis": Double.nan],
            ["text": "Done", "announcementID": "id", "fireAtMillis": Double.infinity],
            ["text": "Done", "announcementID": "id", "fireAtMillis": -1.0],
            ["text": "Done", "announcementID": "id", "delaySeconds": 90.0]
        ] as [[String: Any]] {
            do {
                _ = try ScheduledWorkoutAnnouncement(invalid)
                preconditionFailure("Invalid announcement was accepted")
            } catch {
                precondition((error as NSError).domain == "AutoFit.Announcements")
            }
        }
        print("Native announcement deadline tests passed")
    }
}
