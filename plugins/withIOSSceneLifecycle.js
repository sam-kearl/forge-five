/**
 * Adopt the UIScene life cycle on iOS.
 *
 * Apps built with the iOS 27 SDK refuse to launch unless they use the
 * scene-based life cycle. Expo SDK 57's runtime already ships
 * `ExpoAppSceneDelegate`, but its native project template predates the
 * requirement. This plugin applies the same changes as the SDK 58 template:
 *   1. a `SceneDelegate` that subclasses `ExpoAppSceneDelegate`;
 *   2. a `UIApplicationSceneManifest` entry in Info.plist;
 *   3. an AppDelegate that provides the React Native factory instead of
 *      creating the window itself.
 *
 * Every step is a no-op when the project already has it, so this plugin can be
 * removed safely after upgrading to an SDK whose template includes it.
 */
const fs = require('fs');
const path = require('path');
const { IOSConfig, withAppDelegate, withDangerousMod, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

const SCENE_DELEGATE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (c) => {
    if (!c.modResults.UIApplicationSceneManifest) {
      c.modResults.UIApplicationSceneManifest = {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: 'Default Configuration',
              UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
            },
          ],
        },
      };
    }
    return c;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('withIOSSceneLifecycle expects a Swift AppDelegate.');
    }
    let src = c.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
      // The scene delegate now creates the window and starts React Native.
      src = src.replace(
        /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif/,
        '// The window is created and React Native is started by `SceneDelegate` under the\n    // scene-based life cycle (required by the iOS 27 SDK).',
      );
      if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame: UIScreen.main.bounds)')) {
        throw new Error('withIOSSceneLifecycle could not update AppDelegate.swift; the template may have changed.');
      }
    }
    c.modResults.contents = src;
    return c;
  });
}

function withSceneDelegateFile(config) {
  config = withDangerousMod(config, [
    'ios',
    (c) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
      const file = path.join(c.modRequest.platformProjectRoot, projectName, 'SceneDelegate.swift');
      if (!fs.existsSync(file)) fs.writeFileSync(file, SCENE_DELEGATE);
      return c;
    },
  ]);
  return withXcodeProject(config, (c) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    const filepath = `${projectName}/SceneDelegate.swift`;
    if (!c.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project: c.modResults });
    }
    return c;
  });
}

module.exports = function withIOSSceneLifecycle(config) {
  return withSceneDelegateFile(withSceneAppDelegate(withSceneManifest(config)));
};
