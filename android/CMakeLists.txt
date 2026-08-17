project(nitrobetterauthpasskey)
cmake_minimum_required(VERSION 3.9.0)

set(CMAKE_CXX_STANDARD 20)

# Target name MUST match the target Nitrogen's autolinking cmake references
# (line 30 of NitroBetterAuthPasskey+autolinking.cmake does
# `target_sources(nitrobetterauthpasskey ...)`).
# CMake targets are case-sensitive — this is lowercase.
set(PACKAGE_NAME nitrobetterauthpasskey)

add_library(${PACKAGE_NAME} SHARED
  src/main/cpp/dummy.cpp
)

# Now the autolinking file can attach its sources/definitions/libs to
# the target we just created.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroBetterAuthPasskey+autolinking.cmake)

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