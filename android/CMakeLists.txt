project(NitroBetterAuthPasskey)
cmake_minimum_required(VERSION 3.9.0)

set(CMAKE_CXX_STANDARD 20)
set(PACKAGE_NAME NitroBetterAuthPasskey)

include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroBetterAuthPasskey+autolinking.cmake)

add_library(${PACKAGE_NAME} SHARED
  ${NitroBetterAuthPasskey_NITROGEN_CPP_FILES}
)

target_include_directories(${PACKAGE_NAME} PRIVATE
  "${CMAKE_SOURCE_DIR}/src/main/cpp"
)

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

target_link_libraries(${PACKAGE_NAME}
  android
  ReactAndroid::jsi
  fbjni::fbjni
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(${PACKAGE_NAME} ReactAndroid::reactnative)
else()
  target_link_libraries(${PACKAGE_NAME}
    ReactAndroid::reactnativejni
    ReactAndroid::react_nativemodule_core
    ReactAndroid::turbomodulejsijni
  )
endif()
