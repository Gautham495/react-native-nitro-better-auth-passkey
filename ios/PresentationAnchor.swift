import AuthenticationServices
import Foundation

#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

enum PresentationAnchor {
  static func current() -> ASPresentationAnchor? {
    var result: ASPresentationAnchor?
    let work = {
      #if os(iOS)
      result =
        UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first { $0.isKeyWindow }
      #elseif os(macOS)
      result = NSApplication.shared.mainWindow ?? NSApplication.shared.windows.first
      #endif
    }
    if Thread.isMainThread {
      work()
    } else {
      DispatchQueue.main.sync { work() }
    }
    return result
  }
}
