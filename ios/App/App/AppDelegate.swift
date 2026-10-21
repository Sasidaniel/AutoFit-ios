import UIKit
import Capacitor
import AVFoundation
import UserNotifications

enum WorkoutAudioSession {
    private static var active = false

    private static func options(recording: Bool, ducking: Bool) -> AVAudioSession.CategoryOptions {
        var options: AVAudioSession.CategoryOptions = [.mixWithOthers]
        if ducking { options.insert(.duckOthers) }
        if recording {
            options.formUnion([.allowBluetoothA2DP, .defaultToSpeaker])
            if #available(iOS 26.0, *) { options.insert(.bluetoothHighQualityRecording) }
        }
        return options
    }

    static func matches(recording: Bool, ducking: Bool = false) -> Bool {
        let session = AVAudioSession.sharedInstance()
        return session.category == (recording ? .playAndRecord : .playback)
            && session.mode == .default && session.categoryOptions == options(recording: recording, ducking: ducking)
    }

    static func activate(recording: Bool, ducking: Bool = false, force: Bool = false) throws {
        let session = AVAudioSession.sharedInstance()
        let category: AVAudioSession.Category = recording ? .playAndRecord : .playback
        let changed = !matches(recording: recording, ducking: ducking)
        if changed {
            try session.setCategory(category, mode: .default, options: options(recording: recording, ducking: ducking))
        }
        if !active || changed || force {
            try session.setActive(true)
            active = true
        }
        if recording { try selectInput(session) }
    }

    private static func selectInput(_ session: AVAudioSession) throws {
        let inputs = session.availableInputs ?? []
        let bluetoothOutput = session.currentRoute.outputs.contains {
            [AVAudioSession.Port.bluetoothA2DP, .bluetoothHFP, .bluetoothLE].contains($0.portType)
        }
        let wired = inputs.first { [AVAudioSession.Port.headsetMic, .usbAudio, .lineIn].contains($0.portType) }
        var highQuality: AVAudioSessionPortDescription?
        if #available(iOS 26.0, *) {
            highQuality = inputs.first {
                $0.bluetoothMicrophoneExtension?.highQualityRecording.isSupported == true
            }
        }
        let choice = WorkoutAudioPolicy.input(bluetoothOutput: bluetoothOutput,
            wiredInput: wired != nil, highQualityBluetooth: highQuality != nil)
        let preferred: AVAudioSessionPortDescription?
        switch choice {
        case .wired: preferred = wired
        case .highQualityBluetooth: preferred = highQuality
        case .builtIn: preferred = inputs.first { $0.portType == .builtInMic }
        }
        guard let preferred = preferred else {
            throw NSError(domain: "AutoFit.Audio", code: 5,
                userInfo: [NSLocalizedDescriptionKey: "No microphone is available without lowering music quality"])
        }
        if session.preferredInput?.uid != preferred.uid { try session.setPreferredInput(preferred) }
        if #available(iOS 18.2, *), session.isEchoCancelledInputAvailable, !session.isEchoCancelledInputEnabled {
            try session.setPrefersEchoCancelledInput(true)
        }
    }

    static func deactivate() throws {
        guard active else { return }
        try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        active = false
    }

    static func wasInterrupted() {
        active = false
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    // Shows local notifications (banner + sound) even while the app is in the
    // foreground — by default iOS silently suppresses them in that case.
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }
}
