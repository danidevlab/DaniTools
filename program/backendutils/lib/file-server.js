#!/usr/bin/env -S deno run --allow-net --allow-read

// deno:https://jsr.io/@std/path/1.1.6/_common/assert_path.ts
function assertPath(path) {
  if (typeof path !== "string") {
    throw new TypeError(`Path must be a string, received "${JSON.stringify(path)}"`);
  }
}

// deno:https://jsr.io/@std/path/1.1.6/_common/normalize.ts
function assertArg(path) {
  assertPath(path);
  if (path.length === 0) return ".";
}

// deno:https://jsr.io/@std/path/1.1.6/_common/constants.ts
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;

// deno:https://jsr.io/@std/path/1.1.6/_common/normalize_string.ts
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) code = path.charCodeAt(i);
    else if (isPathSeparator2(code)) break;
    else code = CHAR_FORWARD_SLASH;
    if (isPathSeparator2(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length === 2 || res.length === 1) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0) res += `${separator}..`;
          else res = "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) res += separator + path.slice(lastSlash + 1, i);
        else res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

// deno:https://jsr.io/@std/path/1.1.6/posix/_util.ts
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}

// deno:https://jsr.io/@std/path/1.1.6/_common/from_file_url.ts
function assertArg2(url) {
  url = url instanceof URL ? url : new URL(url);
  if (url.protocol !== "file:") {
    throw new TypeError(`URL must be a file URL: received "${url.protocol}"`);
  }
  return url;
}

// deno:https://jsr.io/@std/path/1.1.6/posix/from_file_url.ts
function fromFileUrl(url) {
  url = assertArg2(url);
  return decodeURIComponent(url.pathname.replace(/%(?![0-9A-Fa-f]{2})/g, "%25"));
}

// deno:https://jsr.io/@std/path/1.1.6/posix/normalize.ts
function normalize(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertArg(path);
  const isAbsolute = isPosixPathSeparator(path.charCodeAt(0));
  const trailingSeparator = isPosixPathSeparator(path.charCodeAt(path.length - 1));
  path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
  if (path.length === 0 && !isAbsolute) path = ".";
  if (path.length > 0 && trailingSeparator) path += "/";
  if (isAbsolute) return `/${path}`;
  return path;
}

// deno:https://jsr.io/@std/internal/1.0.14/_os.ts
function checkWindows() {
  const global = globalThis;
  const platform = global.process?.platform;
  if (typeof platform === "string") return platform.startsWith("win");
  const os = global.Deno?.build?.os;
  if (typeof os === "string") return os === "windows";
  return global.navigator?.platform?.startsWith("Win") ?? false;
}

// deno:https://jsr.io/@std/internal/1.0.14/os.ts
var isWindows = checkWindows();

// deno:https://jsr.io/@std/path/1.1.6/posix/extname.ts
function extname(path) {
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  assertPath(path);
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  let preDotState = 0;
  for (let i = path.length - 1; i >= 0; --i) {
    const code = path.charCodeAt(i);
    if (isPosixPathSeparator(code)) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      preDotState = -1;
    }
  }
  if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
  preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path.slice(startDot, end);
}

// deno:https://jsr.io/@std/path/1.1.6/windows/_util.ts
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z || code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z;
}

// deno:https://jsr.io/@std/path/1.1.6/windows/from_file_url.ts
function fromFileUrl2(url) {
  url = assertArg2(url);
  let path = decodeURIComponent(url.pathname.replace(/\//g, "\\").replace(/%(?![0-9A-Fa-f]{2})/g, "%25")).replace(/^\\*([A-Za-z]:)(\\|$)/, "$1\\");
  if (url.hostname !== "") {
    path = `\\\\${url.hostname}${path}`;
  }
  return path;
}

// deno:https://jsr.io/@std/path/1.1.6/windows/extname.ts
function extname2(path) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  assertPath(path);
  let start = 0;
  let startDot = -1;
  let startPart = 0;
  let end = -1;
  let matchedSlash = true;
  let preDotState = 0;
  if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
    start = startPart = 2;
  }
  for (let i = path.length - 1; i >= start; --i) {
    const code = path.charCodeAt(i);
    if (isPathSeparator(code)) {
      if (!matchedSlash) {
        startPart = i + 1;
        break;
      }
      continue;
    }
    if (end === -1) {
      matchedSlash = false;
      end = i + 1;
    }
    if (code === CHAR_DOT) {
      if (startDot === -1) startDot = i;
      else if (preDotState !== 1) preDotState = 1;
    } else if (startDot !== -1) {
      preDotState = -1;
    }
  }
  if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
  preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
  preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return "";
  }
  return path.slice(startDot, end);
}

// deno:https://jsr.io/@std/path/1.1.6/extname.ts
function extname3(path) {
  return isWindows ? extname2(path) : extname(path);
}

// deno:https://jsr.io/@std/path/1.1.6/posix/join.ts
function join(path, ...paths) {
  if (path === void 0) return ".";
  if (path instanceof URL) {
    path = fromFileUrl(path);
  }
  paths = path ? [
    path,
    ...paths
  ] : paths;
  paths.forEach((path2) => assertPath(path2));
  const joined = paths.filter((path2) => path2.length > 0).join("/");
  return joined === "" ? "." : normalize(joined);
}

// deno:https://jsr.io/@std/path/1.1.6/windows/normalize.ts
function normalize2(path) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  assertArg(path);
  const len = path.length;
  let rootEnd = 0;
  let device;
  let isAbsolute = false;
  const code = path.charCodeAt(0);
  if (len > 1) {
    if (isPathSeparator(code)) {
      isAbsolute = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        for (; j < len; ++j) {
          if (isPathSeparator(path.charCodeAt(j))) break;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          for (; j < len; ++j) {
            if (!isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            last = j;
            for (; j < len; ++j) {
              if (isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            } else if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code)) {
      if (path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2) {
          if (isPathSeparator(path.charCodeAt(2))) {
            isAbsolute = true;
            rootEnd = 3;
          }
        }
      }
    }
  } else if (isPathSeparator(code)) {
    return "\\";
  }
  let tail;
  if (rootEnd < len) {
    tail = normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator);
  } else {
    tail = "";
  }
  if (tail.length === 0 && !isAbsolute) tail = ".";
  if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
    tail += "\\";
  }
  if (device === void 0) {
    if (isAbsolute) {
      if (tail.length > 0) return `\\${tail}`;
      else return "\\";
    }
    return tail;
  } else if (isAbsolute) {
    if (tail.length > 0) return `${device}\\${tail}`;
    else return `${device}\\`;
  }
  return device + tail;
}

// deno:https://jsr.io/@std/path/1.1.6/windows/join.ts
function join2(path, ...paths) {
  if (path instanceof URL) {
    path = fromFileUrl2(path);
  }
  paths = path ? [
    path,
    ...paths
  ] : paths;
  paths.forEach((path2) => assertPath(path2));
  paths = paths.filter((path2) => path2.length > 0);
  if (paths.length === 0) return ".";
  let needsReplace = true;
  let slashCount = 0;
  const firstPart = paths[0];
  if (isPathSeparator(firstPart.charCodeAt(0))) {
    ++slashCount;
    const firstLen = firstPart.length;
    if (firstLen > 1) {
      if (isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) ++slashCount;
          else {
            needsReplace = false;
          }
        }
      }
    }
  }
  let joined = paths.join("\\");
  if (needsReplace) {
    for (; slashCount < joined.length; ++slashCount) {
      if (!isPathSeparator(joined.charCodeAt(slashCount))) break;
    }
    if (slashCount >= 2) joined = `\\${joined.slice(slashCount)}`;
  }
  return normalize2(joined);
}

// deno:https://jsr.io/@std/path/1.1.6/join.ts
function join3(path, ...paths) {
  return isWindows ? join2(path, ...paths) : join(path, ...paths);
}

// deno:https://jsr.io/@std/path/1.1.6/_common/env.ts
function cwd(errorMessage) {
  const global = globalThis;
  const getCwd = global.process?.cwd ?? global.Deno?.cwd;
  if (typeof getCwd !== "function") {
    throw new TypeError(errorMessage);
  }
  return getCwd();
}

// deno:https://jsr.io/@std/path/1.1.6/posix/resolve.ts
function resolve(...pathSegments) {
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    let path;
    if (i >= 0) path = pathSegments[i];
    else {
      path = cwd("Resolved a relative path without a current working directory (CWD)");
    }
    assertPath(path);
    if (path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isPosixPathSeparator(path.charCodeAt(0));
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
  if (resolvedAbsolute) {
    if (resolvedPath.length > 0) return `/${resolvedPath}`;
    else return "/";
  } else if (resolvedPath.length > 0) return resolvedPath;
  else return ".";
}

// deno:https://jsr.io/@std/path/1.1.6/_common/relative.ts
function assertArgs(from, to) {
  assertPath(from);
  assertPath(to);
  if (from === to) return "";
}

// deno:https://jsr.io/@std/path/1.1.6/posix/relative.ts
function relative(from, to) {
  assertArgs(from, to);
  from = resolve(from);
  to = resolve(to);
  if (from === to) return "";
  let fromStart = 1;
  const fromEnd = from.length;
  for (; fromStart < fromEnd; ++fromStart) {
    if (!isPosixPathSeparator(from.charCodeAt(fromStart))) break;
  }
  const fromLen = fromEnd - fromStart;
  let toStart = 1;
  const toEnd = to.length;
  for (; toStart < toEnd; ++toStart) {
    if (!isPosixPathSeparator(to.charCodeAt(toStart))) break;
  }
  const toLen = toEnd - toStart;
  const length = fromLen < toLen ? fromLen : toLen;
  let lastCommonSep = -1;
  let i = 0;
  for (; i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (isPosixPathSeparator(to.charCodeAt(toStart + i))) {
          return to.slice(toStart + i + 1);
        } else if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (isPosixPathSeparator(from.charCodeAt(fromStart + i))) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
      break;
    }
    const fromCode = from.charCodeAt(fromStart + i);
    const toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode) break;
    else if (isPosixPathSeparator(fromCode)) lastCommonSep = i;
  }
  let out = "";
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || isPosixPathSeparator(from.charCodeAt(i))) {
      if (out.length === 0) out += "..";
      else out += "/..";
    }
  }
  if (out.length > 0) return out + to.slice(toStart + lastCommonSep);
  else {
    toStart += lastCommonSep;
    if (isPosixPathSeparator(to.charCodeAt(toStart))) ++toStart;
    return to.slice(toStart);
  }
}

// deno:https://jsr.io/@std/path/1.1.6/windows/resolve.ts
function resolve2(...pathSegments) {
  let resolvedDevice = "";
  let resolvedTail = "";
  let resolvedAbsolute = false;
  for (let i = pathSegments.length - 1; i >= -1; i--) {
    let path;
    if (i >= 0) {
      path = pathSegments[i];
    } else if (!resolvedDevice) {
      path = cwd("Resolved a drive-letter-less path without a current working directory (CWD)");
    } else {
      path = cwd("Resolved a relative path without a current working directory (CWD)");
      if (path === void 0 || path.slice(0, 3).toLowerCase() !== `${resolvedDevice.toLowerCase()}\\`) {
        path = `${resolvedDevice}\\`;
      }
    }
    assertPath(path);
    const len = path.length;
    if (len === 0) continue;
    let rootEnd = 0;
    let device = "";
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len > 1) {
      if (isPathSeparator(code)) {
        isAbsolute = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          for (; j < len; ++j) {
            if (isPathSeparator(path.charCodeAt(j))) break;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            for (; j < len; ++j) {
              if (!isPathSeparator(path.charCodeAt(j))) break;
            }
            if (j < len && j !== last) {
              last = j;
              for (; j < len; ++j) {
                if (isPathSeparator(path.charCodeAt(j))) break;
              }
              if (j === len) {
                device = `\\\\${firstPart}\\${path.slice(last)}`;
                rootEnd = j;
              } else if (j !== last) {
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code)) {
        if (path.charCodeAt(1) === CHAR_COLON) {
          device = path.slice(0, 2);
          rootEnd = 2;
          if (len > 2) {
            if (isPathSeparator(path.charCodeAt(2))) {
              isAbsolute = true;
              rootEnd = 3;
            }
          }
        }
      }
    } else if (isPathSeparator(code)) {
      rootEnd = 1;
      isAbsolute = true;
    }
    if (device.length > 0 && resolvedDevice.length > 0 && device.toLowerCase() !== resolvedDevice.toLowerCase()) {
      continue;
    }
    if (resolvedDevice.length === 0 && device.length > 0) {
      resolvedDevice = device;
    }
    if (!resolvedAbsolute) {
      resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
      resolvedAbsolute = isAbsolute;
    }
    if (resolvedAbsolute && resolvedDevice.length > 0) break;
  }
  resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
  return resolvedDevice + (resolvedAbsolute ? "\\" : "") + resolvedTail || ".";
}

// deno:https://jsr.io/@std/path/1.1.6/windows/relative.ts
function relative2(from, to) {
  assertArgs(from, to);
  const fromOrig = resolve2(from);
  const toOrig = resolve2(to);
  if (fromOrig === toOrig) return "";
  from = fromOrig.toLowerCase();
  to = toOrig.toLowerCase();
  if (from === to) return "";
  let fromStart = 0;
  let fromEnd = from.length;
  for (; fromStart < fromEnd; ++fromStart) {
    if (from.charCodeAt(fromStart) !== CHAR_BACKWARD_SLASH) break;
  }
  for (; fromEnd - 1 > fromStart; --fromEnd) {
    if (from.charCodeAt(fromEnd - 1) !== CHAR_BACKWARD_SLASH) break;
  }
  const fromLen = fromEnd - fromStart;
  let toStart = 0;
  let toEnd = to.length;
  for (; toStart < toEnd; ++toStart) {
    if (to.charCodeAt(toStart) !== CHAR_BACKWARD_SLASH) break;
  }
  for (; toEnd - 1 > toStart; --toEnd) {
    if (to.charCodeAt(toEnd - 1) !== CHAR_BACKWARD_SLASH) break;
  }
  const toLen = toEnd - toStart;
  const length = fromLen < toLen ? fromLen : toLen;
  let lastCommonSep = -1;
  let i = 0;
  for (; i <= length; ++i) {
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        } else if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      break;
    }
    const fromCode = from.charCodeAt(fromStart + i);
    const toCode = to.charCodeAt(toStart + i);
    if (fromCode !== toCode) break;
    else if (fromCode === CHAR_BACKWARD_SLASH) lastCommonSep = i;
  }
  if (i !== length && lastCommonSep === -1) {
    return toOrig;
  }
  let out = "";
  if (lastCommonSep === -1) lastCommonSep = 0;
  for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
    if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
      if (out.length === 0) out += "..";
      else out += "\\..";
    }
  }
  if (out.length > 0) {
    return out + toOrig.slice(toStart + lastCommonSep, toEnd);
  } else {
    toStart += lastCommonSep;
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) ++toStart;
    return toOrig.slice(toStart, toEnd);
  }
}

// deno:https://jsr.io/@std/path/1.1.6/relative.ts
function relative3(from, to) {
  return isWindows ? relative2(from, to) : relative(from, to);
}

// deno:https://jsr.io/@std/path/1.1.6/resolve.ts
function resolve3(...pathSegments) {
  return isWindows ? resolve2(...pathSegments) : resolve(...pathSegments);
}

// deno:https://jsr.io/@std/path/1.1.6/constants.ts
var SEPARATOR_PATTERN = isWindows ? /[\\/]+/ : /\/+/;

// deno:https://jsr.io/@std/fs/1.0.24/exists.ts
async function exists(path, options) {
  try {
    const stat = await Deno.stat(path);
    if (options && (options.isReadable || options.isDirectory || options.isFile)) {
      if (options.isDirectory && options.isFile) {
        throw new TypeError("ExistsOptions.options.isDirectory and ExistsOptions.options.isFile must not be true together");
      }
      if (options.isDirectory && !stat.isDirectory || options.isFile && !stat.isFile) {
        return false;
      }
      if (options.isReadable) {
        return fileIsReadable(stat);
      }
    }
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    if (error instanceof Deno.errors.PermissionDenied) {
      if ((await Deno.permissions.query({
        name: "read",
        path
      })).state === "granted") {
        return !options?.isReadable;
      }
    }
    throw error;
  }
}
function fileIsReadable(stat) {
  if (stat.mode === null) {
    return true;
  } else if (Deno.uid() === stat.uid) {
    return (stat.mode & 256) === 256;
  } else if (Deno.gid() === stat.gid) {
    return (stat.mode & 32) === 32;
  }
  return (stat.mode & 4) === 4;
}

// deno:https://jsr.io/@std/media-types/1.1.0/_util.ts
function consumeToken(v) {
  const notPos = indexOf(v, isNotTokenChar);
  if (notPos === -1) {
    return [
      v,
      ""
    ];
  }
  if (notPos === 0) {
    return [
      "",
      v
    ];
  }
  return [
    v.slice(0, notPos),
    v.slice(notPos)
  ];
}
function consumeValue(v) {
  if (!v) {
    return [
      "",
      v
    ];
  }
  if (v[0] !== `"`) {
    return consumeToken(v);
  }
  let value = "";
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (r === `"`) {
      return [
        value,
        v.slice(i + 1)
      ];
    }
    const next = v[i + 1];
    if (r === "\\" && typeof next === "string" && isTSpecial(next)) {
      value += next;
      i++;
      continue;
    }
    if (r === "\r" || r === "\n") {
      return [
        "",
        v
      ];
    }
    value += v[i];
  }
  return [
    "",
    v
  ];
}
function consumeMediaParam(v) {
  let rest = v.trimStart();
  if (!rest.startsWith(";")) {
    return [
      "",
      "",
      v
    ];
  }
  rest = rest.slice(1);
  rest = rest.trimStart();
  let param;
  [param, rest] = consumeToken(rest);
  param = param.toLowerCase();
  if (!param) {
    return [
      "",
      "",
      v
    ];
  }
  rest = rest.slice(1);
  rest = rest.trimStart();
  const [value, rest2] = consumeValue(rest);
  if (value === "" && rest2 === rest) {
    return [
      "",
      "",
      v
    ];
  }
  rest = rest2;
  return [
    param,
    value,
    rest
  ];
}
function decode2331Encoding(v) {
  const sv = v.split(`'`, 3);
  if (sv.length !== 3) {
    return void 0;
  }
  const [sv0, , sv2] = sv;
  const charset = sv0.toLowerCase();
  if (!charset) {
    return void 0;
  }
  if (charset !== "us-ascii" && charset !== "utf-8") {
    return void 0;
  }
  const encv = decodeURI(sv2);
  if (!encv) {
    return void 0;
  }
  return encv;
}
function indexOf(s, fn) {
  let i = -1;
  for (const v of s) {
    i++;
    if (fn(v)) {
      return i;
    }
  }
  return -1;
}
function isIterator(obj) {
  if (obj === null || obj === void 0) {
    return false;
  }
  return typeof obj[Symbol.iterator] === "function";
}
function isToken(s) {
  if (!s) {
    return false;
  }
  return indexOf(s, isNotTokenChar) < 0;
}
function isNotTokenChar(r) {
  return !isTokenChar(r);
}
function isTokenChar(r) {
  const code = r.charCodeAt(0);
  return code > 32 && code < 127 && !isTSpecial(r);
}
function isTSpecial(r) {
  return r[0] ? `()<>@,;:\\"/[]?=`.includes(r[0]) : false;
}
var CHAR_CODE_SPACE = " ".charCodeAt(0);
var CHAR_CODE_TILDE = "~".charCodeAt(0);
function needsEncoding(s) {
  for (const b of s) {
    const charCode = b.charCodeAt(0);
    if ((charCode < CHAR_CODE_SPACE || charCode > CHAR_CODE_TILDE) && b !== "	") {
      return true;
    }
  }
  return false;
}

// deno:https://jsr.io/@std/media-types/1.1.0/parse_media_type.ts
var SEMICOLON_REGEXP = /^\s*;\s*$/;
function parseMediaType(type) {
  const [base] = type.split(";");
  const mediaType = base.toLowerCase().trim();
  const params = {};
  const continuation = /* @__PURE__ */ new Map();
  type = type.slice(base.length);
  while (type.length) {
    type = type.trimStart();
    if (type.length === 0) {
      break;
    }
    const [key, value, rest] = consumeMediaParam(type);
    if (!key) {
      if (SEMICOLON_REGEXP.test(rest)) {
        break;
      }
      throw new TypeError(`Cannot parse media type: invalid parameter "${type}"`);
    }
    let pmap = params;
    const [baseName, rest2] = key.split("*");
    if (baseName && rest2 !== void 0) {
      if (!continuation.has(baseName)) {
        continuation.set(baseName, {});
      }
      pmap = continuation.get(baseName);
    }
    if (key in pmap) {
      throw new TypeError("Cannot parse media type: duplicate key");
    }
    pmap[key] = value;
    type = rest;
  }
  let str = "";
  for (const [key, pieceMap] of continuation) {
    const singlePartKey = `${key}*`;
    const type2 = pieceMap[singlePartKey];
    if (type2) {
      const decv = decode2331Encoding(type2);
      if (decv) {
        params[key] = decv;
      }
      continue;
    }
    str = "";
    let valid = false;
    for (let n = 0; ; n++) {
      const simplePart = `${key}*${n}`;
      let type3 = pieceMap[simplePart];
      if (type3) {
        valid = true;
        str += type3;
        continue;
      }
      const encodedPart = `${simplePart}*`;
      type3 = pieceMap[encodedPart];
      if (!type3) {
        break;
      }
      valid = true;
      if (n === 0) {
        const decv = decode2331Encoding(type3);
        if (decv) {
          str += decv;
        }
      } else {
        const decv = decodeURI(type3);
        str += decv;
      }
    }
    if (valid) {
      params[key] = str;
    }
  }
  return [
    mediaType,
    Object.keys(params).length ? params : void 0
  ];
}

// deno:https://jsr.io/@std/media-types/1.1.0/vendor/db.ts
var db_default = {
  "application/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "application/3gpdash-qoe-report+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/3gpp-ims+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/3gpphal+json": {
    "source": "iana",
    "compressible": true
  },
  "application/3gpphalforms+json": {
    "source": "iana",
    "compressible": true
  },
  "application/a2l": {
    "source": "iana"
  },
  "application/ace+cbor": {
    "source": "iana"
  },
  "application/ace+json": {
    "source": "iana",
    "compressible": true
  },
  "application/ace-groupcomm+cbor": {
    "source": "iana"
  },
  "application/activemessage": {
    "source": "iana"
  },
  "application/activity+json": {
    "source": "iana",
    "compressible": true
  },
  "application/aif+cbor": {
    "source": "iana"
  },
  "application/aif+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-cdni+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-cdnifilter+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-costmap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-costmapfilter+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-directory+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointcost+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointcostparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointprop+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-endpointpropparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-error+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-networkmap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-networkmapfilter+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-propmap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-propmapparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-tips+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-tipsparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-updatestreamcontrol+json": {
    "source": "iana",
    "compressible": true
  },
  "application/alto-updatestreamparams+json": {
    "source": "iana",
    "compressible": true
  },
  "application/aml": {
    "source": "iana"
  },
  "application/andrew-inset": {
    "source": "iana",
    "extensions": [
      "ez"
    ]
  },
  "application/appinstaller": {
    "compressible": false,
    "extensions": [
      "appinstaller"
    ]
  },
  "application/applefile": {
    "source": "iana"
  },
  "application/applixware": {
    "source": "apache",
    "extensions": [
      "aw"
    ]
  },
  "application/appx": {
    "compressible": false,
    "extensions": [
      "appx"
    ]
  },
  "application/appxbundle": {
    "compressible": false,
    "extensions": [
      "appxbundle"
    ]
  },
  "application/at+jwt": {
    "source": "iana"
  },
  "application/atf": {
    "source": "iana"
  },
  "application/atfx": {
    "source": "iana"
  },
  "application/atom+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "atom"
    ]
  },
  "application/atomcat+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "atomcat"
    ]
  },
  "application/atomdeleted+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "atomdeleted"
    ]
  },
  "application/atomicmail": {
    "source": "iana"
  },
  "application/atomsvc+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "atomsvc"
    ]
  },
  "application/atsc-dwd+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "dwd"
    ]
  },
  "application/atsc-dynamic-event-message": {
    "source": "iana"
  },
  "application/atsc-held+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "held"
    ]
  },
  "application/atsc-rdt+json": {
    "source": "iana",
    "compressible": true
  },
  "application/atsc-rsat+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rsat"
    ]
  },
  "application/atxml": {
    "source": "iana"
  },
  "application/auth-policy+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/automationml-aml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "aml"
    ]
  },
  "application/automationml-amlx+zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "amlx"
    ]
  },
  "application/bacnet-xdd+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/batch-smtp": {
    "source": "iana"
  },
  "application/bdoc": {
    "compressible": false,
    "extensions": [
      "bdoc"
    ]
  },
  "application/beep+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/bufr": {
    "source": "iana"
  },
  "application/c2pa": {
    "source": "iana"
  },
  "application/calendar+json": {
    "source": "iana",
    "compressible": true
  },
  "application/calendar+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xcs"
    ]
  },
  "application/call-completion": {
    "source": "iana"
  },
  "application/cals-1840": {
    "source": "iana"
  },
  "application/captive+json": {
    "source": "iana",
    "compressible": true
  },
  "application/cbor": {
    "source": "iana"
  },
  "application/cbor-seq": {
    "source": "iana"
  },
  "application/cccex": {
    "source": "iana"
  },
  "application/ccmp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/ccxml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ccxml"
    ]
  },
  "application/cda+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/cdfx+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "cdfx"
    ]
  },
  "application/cdmi-capability": {
    "source": "iana",
    "extensions": [
      "cdmia"
    ]
  },
  "application/cdmi-container": {
    "source": "iana",
    "extensions": [
      "cdmic"
    ]
  },
  "application/cdmi-domain": {
    "source": "iana",
    "extensions": [
      "cdmid"
    ]
  },
  "application/cdmi-object": {
    "source": "iana",
    "extensions": [
      "cdmio"
    ]
  },
  "application/cdmi-queue": {
    "source": "iana",
    "extensions": [
      "cdmiq"
    ]
  },
  "application/cdni": {
    "source": "iana"
  },
  "application/cea": {
    "source": "iana"
  },
  "application/cea-2018+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/cellml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/cfw": {
    "source": "iana"
  },
  "application/cid-edhoc+cbor-seq": {
    "source": "iana"
  },
  "application/city+json": {
    "source": "iana",
    "compressible": true
  },
  "application/clr": {
    "source": "iana"
  },
  "application/clue+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/clue_info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/cms": {
    "source": "iana"
  },
  "application/cnrp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/coap-group+json": {
    "source": "iana",
    "compressible": true
  },
  "application/coap-payload": {
    "source": "iana"
  },
  "application/commonground": {
    "source": "iana"
  },
  "application/concise-problem-details+cbor": {
    "source": "iana"
  },
  "application/conference-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/cose": {
    "source": "iana"
  },
  "application/cose-key": {
    "source": "iana"
  },
  "application/cose-key-set": {
    "source": "iana"
  },
  "application/cose-x509": {
    "source": "iana"
  },
  "application/cpl+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "cpl"
    ]
  },
  "application/csrattrs": {
    "source": "iana"
  },
  "application/csta+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/cstadata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/csvm+json": {
    "source": "iana",
    "compressible": true
  },
  "application/cu-seeme": {
    "source": "apache",
    "extensions": [
      "cu"
    ]
  },
  "application/cwl": {
    "source": "iana",
    "extensions": [
      "cwl"
    ]
  },
  "application/cwl+json": {
    "source": "iana",
    "compressible": true
  },
  "application/cwl+yaml": {
    "source": "iana"
  },
  "application/cwt": {
    "source": "iana"
  },
  "application/cybercash": {
    "source": "iana"
  },
  "application/dart": {
    "compressible": true
  },
  "application/dash+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mpd"
    ]
  },
  "application/dash-patch+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mpp"
    ]
  },
  "application/dashdelta": {
    "source": "iana"
  },
  "application/davmount+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "davmount"
    ]
  },
  "application/dca-rft": {
    "source": "iana"
  },
  "application/dcd": {
    "source": "iana"
  },
  "application/dec-dx": {
    "source": "iana"
  },
  "application/dialog-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/dicom": {
    "source": "iana"
  },
  "application/dicom+json": {
    "source": "iana",
    "compressible": true
  },
  "application/dicom+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/dii": {
    "source": "iana"
  },
  "application/dit": {
    "source": "iana"
  },
  "application/dns": {
    "source": "iana"
  },
  "application/dns+json": {
    "source": "iana",
    "compressible": true
  },
  "application/dns-message": {
    "source": "iana"
  },
  "application/docbook+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "dbk"
    ]
  },
  "application/dots+cbor": {
    "source": "iana"
  },
  "application/dpop+jwt": {
    "source": "iana"
  },
  "application/dskpp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/dssc+der": {
    "source": "iana",
    "extensions": [
      "dssc"
    ]
  },
  "application/dssc+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xdssc"
    ]
  },
  "application/dvcs": {
    "source": "iana"
  },
  "application/ecmascript": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "ecma"
    ]
  },
  "application/edhoc+cbor-seq": {
    "source": "iana"
  },
  "application/edi-consent": {
    "source": "iana"
  },
  "application/edi-x12": {
    "source": "iana",
    "compressible": false
  },
  "application/edifact": {
    "source": "iana",
    "compressible": false
  },
  "application/efi": {
    "source": "iana"
  },
  "application/elm+json": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/elm+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.cap+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/emergencycalldata.comment+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.control+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.deviceinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.ecall.msd": {
    "source": "iana"
  },
  "application/emergencycalldata.legacyesn+json": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.providerinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.serviceinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.subscriberinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emergencycalldata.veds+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/emma+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "emma"
    ]
  },
  "application/emotionml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "emotionml"
    ]
  },
  "application/encaprtp": {
    "source": "iana"
  },
  "application/epp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/epub+zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "epub"
    ]
  },
  "application/eshop": {
    "source": "iana"
  },
  "application/exi": {
    "source": "iana",
    "extensions": [
      "exi"
    ]
  },
  "application/expect-ct-report+json": {
    "source": "iana",
    "compressible": true
  },
  "application/express": {
    "source": "iana",
    "extensions": [
      "exp"
    ]
  },
  "application/fastinfoset": {
    "source": "iana"
  },
  "application/fastsoap": {
    "source": "iana"
  },
  "application/fdf": {
    "source": "iana",
    "extensions": [
      "fdf"
    ]
  },
  "application/fdt+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "fdt"
    ]
  },
  "application/fhir+json": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/fhir+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/fido.trusted-apps+json": {
    "compressible": true
  },
  "application/fits": {
    "source": "iana"
  },
  "application/flexfec": {
    "source": "iana"
  },
  "application/font-sfnt": {
    "source": "iana"
  },
  "application/font-tdpfr": {
    "source": "iana",
    "extensions": [
      "pfr"
    ]
  },
  "application/font-woff": {
    "source": "iana",
    "compressible": false
  },
  "application/framework-attributes+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/geo+json": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "geojson"
    ]
  },
  "application/geo+json-seq": {
    "source": "iana"
  },
  "application/geopackage+sqlite3": {
    "source": "iana"
  },
  "application/geoxacml+json": {
    "source": "iana",
    "compressible": true
  },
  "application/geoxacml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/gltf-buffer": {
    "source": "iana"
  },
  "application/gml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "gml"
    ]
  },
  "application/gnap-binding-jws": {
    "source": "iana"
  },
  "application/gnap-binding-jwsd": {
    "source": "iana"
  },
  "application/gnap-binding-rotation-jws": {
    "source": "iana"
  },
  "application/gnap-binding-rotation-jwsd": {
    "source": "iana"
  },
  "application/gpx+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "gpx"
    ]
  },
  "application/grib": {
    "source": "iana"
  },
  "application/gxf": {
    "source": "apache",
    "extensions": [
      "gxf"
    ]
  },
  "application/gzip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "gz"
    ]
  },
  "application/h224": {
    "source": "iana"
  },
  "application/held+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/hjson": {
    "extensions": [
      "hjson"
    ]
  },
  "application/hl7v2+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/http": {
    "source": "iana"
  },
  "application/hyperstudio": {
    "source": "iana",
    "extensions": [
      "stk"
    ]
  },
  "application/ibe-key-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/ibe-pkg-reply+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/ibe-pp-data": {
    "source": "iana"
  },
  "application/iges": {
    "source": "iana"
  },
  "application/im-iscomposing+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/index": {
    "source": "iana"
  },
  "application/index.cmd": {
    "source": "iana"
  },
  "application/index.obj": {
    "source": "iana"
  },
  "application/index.response": {
    "source": "iana"
  },
  "application/index.vnd": {
    "source": "iana"
  },
  "application/inkml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ink",
      "inkml"
    ]
  },
  "application/iotp": {
    "source": "iana"
  },
  "application/ipfix": {
    "source": "iana",
    "extensions": [
      "ipfix"
    ]
  },
  "application/ipp": {
    "source": "iana"
  },
  "application/isup": {
    "source": "iana"
  },
  "application/its+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "its"
    ]
  },
  "application/java-archive": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "jar",
      "war",
      "ear"
    ]
  },
  "application/java-serialized-object": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "ser"
    ]
  },
  "application/java-vm": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "class"
    ]
  },
  "application/javascript": {
    "source": "apache",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "js"
    ]
  },
  "application/jf2feed+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jose": {
    "source": "iana"
  },
  "application/jose+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jrd+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jscalendar+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jscontact+json": {
    "source": "iana",
    "compressible": true
  },
  "application/json": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "json",
      "map"
    ]
  },
  "application/json-patch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/json-seq": {
    "source": "iana"
  },
  "application/json5": {
    "extensions": [
      "json5"
    ]
  },
  "application/jsonml+json": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "jsonml"
    ]
  },
  "application/jsonpath": {
    "source": "iana"
  },
  "application/jwk+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jwk-set+json": {
    "source": "iana",
    "compressible": true
  },
  "application/jwt": {
    "source": "iana"
  },
  "application/kpml-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/kpml-response+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/ld+json": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "jsonld"
    ]
  },
  "application/lgr+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "lgr"
    ]
  },
  "application/link-format": {
    "source": "iana"
  },
  "application/linkset": {
    "source": "iana"
  },
  "application/linkset+json": {
    "source": "iana",
    "compressible": true
  },
  "application/load-control+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/logout+jwt": {
    "source": "iana"
  },
  "application/lost+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "lostxml"
    ]
  },
  "application/lostsync+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/lpf+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/lxf": {
    "source": "iana"
  },
  "application/mac-binhex40": {
    "source": "iana",
    "extensions": [
      "hqx"
    ]
  },
  "application/mac-compactpro": {
    "source": "apache",
    "extensions": [
      "cpt"
    ]
  },
  "application/macwriteii": {
    "source": "iana"
  },
  "application/mads+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mads"
    ]
  },
  "application/manifest+json": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "webmanifest"
    ]
  },
  "application/marc": {
    "source": "iana",
    "extensions": [
      "mrc"
    ]
  },
  "application/marcxml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mrcx"
    ]
  },
  "application/mathematica": {
    "source": "iana",
    "extensions": [
      "ma",
      "nb",
      "mb"
    ]
  },
  "application/mathml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mathml"
    ]
  },
  "application/mathml-content+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mathml-presentation+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-associated-procedure-description+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-deregister+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-envelope+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-msk+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-msk-response+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-protection-description+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-reception-report+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-register+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-register-response+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-schedule+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbms-user-service-description+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mbox": {
    "source": "iana",
    "extensions": [
      "mbox"
    ]
  },
  "application/media-policy-dataset+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mpf"
    ]
  },
  "application/media_control+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mediaservercontrol+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mscml"
    ]
  },
  "application/merge-patch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/metalink+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "metalink"
    ]
  },
  "application/metalink4+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "meta4"
    ]
  },
  "application/mets+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mets"
    ]
  },
  "application/mf4": {
    "source": "iana"
  },
  "application/mikey": {
    "source": "iana"
  },
  "application/mipc": {
    "source": "iana"
  },
  "application/missing-blocks+cbor-seq": {
    "source": "iana"
  },
  "application/mmt-aei+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "maei"
    ]
  },
  "application/mmt-usd+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "musd"
    ]
  },
  "application/mods+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mods"
    ]
  },
  "application/moss-keys": {
    "source": "iana"
  },
  "application/moss-signature": {
    "source": "iana"
  },
  "application/mosskey-data": {
    "source": "iana"
  },
  "application/mosskey-request": {
    "source": "iana"
  },
  "application/mp21": {
    "source": "iana",
    "extensions": [
      "m21",
      "mp21"
    ]
  },
  "application/mp4": {
    "source": "iana",
    "extensions": [
      "mp4",
      "mpg4",
      "mp4s",
      "m4p"
    ]
  },
  "application/mpeg4-generic": {
    "source": "iana"
  },
  "application/mpeg4-iod": {
    "source": "iana"
  },
  "application/mpeg4-iod-xmt": {
    "source": "iana"
  },
  "application/mrb-consumer+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/mrb-publish+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/msc-ivr+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/msc-mixer+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/msix": {
    "compressible": false,
    "extensions": [
      "msix"
    ]
  },
  "application/msixbundle": {
    "compressible": false,
    "extensions": [
      "msixbundle"
    ]
  },
  "application/msword": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "doc",
      "dot"
    ]
  },
  "application/mud+json": {
    "source": "iana",
    "compressible": true
  },
  "application/multipart-core": {
    "source": "iana"
  },
  "application/mxf": {
    "source": "iana",
    "extensions": [
      "mxf"
    ]
  },
  "application/n-quads": {
    "source": "iana",
    "extensions": [
      "nq"
    ]
  },
  "application/n-triples": {
    "source": "iana",
    "extensions": [
      "nt"
    ]
  },
  "application/nasdata": {
    "source": "iana"
  },
  "application/news-checkgroups": {
    "source": "iana",
    "charset": "US-ASCII"
  },
  "application/news-groupinfo": {
    "source": "iana",
    "charset": "US-ASCII"
  },
  "application/news-transmission": {
    "source": "iana"
  },
  "application/nlsml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/node": {
    "source": "iana",
    "extensions": [
      "cjs"
    ]
  },
  "application/nss": {
    "source": "iana"
  },
  "application/oauth-authz-req+jwt": {
    "source": "iana"
  },
  "application/oblivious-dns-message": {
    "source": "iana"
  },
  "application/ocsp-request": {
    "source": "iana"
  },
  "application/ocsp-response": {
    "source": "iana"
  },
  "application/octet-stream": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "bin",
      "dms",
      "lrf",
      "mar",
      "so",
      "dist",
      "distz",
      "pkg",
      "bpk",
      "dump",
      "elc",
      "deploy",
      "exe",
      "dll",
      "deb",
      "dmg",
      "iso",
      "img",
      "msi",
      "msp",
      "msm",
      "buffer"
    ]
  },
  "application/oda": {
    "source": "iana",
    "extensions": [
      "oda"
    ]
  },
  "application/odm+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/odx": {
    "source": "iana"
  },
  "application/oebps-package+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "opf"
    ]
  },
  "application/ogg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "ogx"
    ]
  },
  "application/ohttp-keys": {
    "source": "iana"
  },
  "application/omdoc+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "omdoc"
    ]
  },
  "application/onenote": {
    "source": "apache",
    "extensions": [
      "onetoc",
      "onetoc2",
      "onetmp",
      "onepkg"
    ]
  },
  "application/opc-nodeset+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/oscore": {
    "source": "iana"
  },
  "application/oxps": {
    "source": "iana",
    "extensions": [
      "oxps"
    ]
  },
  "application/p21": {
    "source": "iana"
  },
  "application/p21+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/p2p-overlay+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "relo"
    ]
  },
  "application/parityfec": {
    "source": "iana"
  },
  "application/passport": {
    "source": "iana"
  },
  "application/patch-ops-error+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xer"
    ]
  },
  "application/pdf": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "pdf"
    ]
  },
  "application/pdx": {
    "source": "iana"
  },
  "application/pem-certificate-chain": {
    "source": "iana"
  },
  "application/pgp-encrypted": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "pgp"
    ]
  },
  "application/pgp-keys": {
    "source": "iana",
    "extensions": [
      "asc"
    ]
  },
  "application/pgp-signature": {
    "source": "iana",
    "extensions": [
      "sig",
      "asc"
    ]
  },
  "application/pics-rules": {
    "source": "apache",
    "extensions": [
      "prf"
    ]
  },
  "application/pidf+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/pidf-diff+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/pkcs10": {
    "source": "iana",
    "extensions": [
      "p10"
    ]
  },
  "application/pkcs12": {
    "source": "iana"
  },
  "application/pkcs7-mime": {
    "source": "iana",
    "extensions": [
      "p7m",
      "p7c"
    ]
  },
  "application/pkcs7-signature": {
    "source": "iana",
    "extensions": [
      "p7s"
    ]
  },
  "application/pkcs8": {
    "source": "iana",
    "extensions": [
      "p8"
    ]
  },
  "application/pkcs8-encrypted": {
    "source": "iana"
  },
  "application/pkix-attr-cert": {
    "source": "iana",
    "extensions": [
      "ac"
    ]
  },
  "application/pkix-cert": {
    "source": "iana",
    "extensions": [
      "cer"
    ]
  },
  "application/pkix-crl": {
    "source": "iana",
    "extensions": [
      "crl"
    ]
  },
  "application/pkix-pkipath": {
    "source": "iana",
    "extensions": [
      "pkipath"
    ]
  },
  "application/pkixcmp": {
    "source": "iana",
    "extensions": [
      "pki"
    ]
  },
  "application/pls+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "pls"
    ]
  },
  "application/poc-settings+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/postscript": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ai",
      "eps",
      "ps"
    ]
  },
  "application/ppsp-tracker+json": {
    "source": "iana",
    "compressible": true
  },
  "application/private-token-issuer-directory": {
    "source": "iana"
  },
  "application/private-token-request": {
    "source": "iana"
  },
  "application/private-token-response": {
    "source": "iana"
  },
  "application/problem+json": {
    "source": "iana",
    "compressible": true
  },
  "application/problem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/provenance+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "provx"
    ]
  },
  "application/prs.alvestrand.titrax-sheet": {
    "source": "iana"
  },
  "application/prs.cww": {
    "source": "iana",
    "extensions": [
      "cww"
    ]
  },
  "application/prs.cyn": {
    "source": "iana",
    "charset": "7-BIT"
  },
  "application/prs.hpub+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/prs.implied-document+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/prs.implied-executable": {
    "source": "iana"
  },
  "application/prs.implied-object+json": {
    "source": "iana",
    "compressible": true
  },
  "application/prs.implied-object+json-seq": {
    "source": "iana"
  },
  "application/prs.implied-object+yaml": {
    "source": "iana"
  },
  "application/prs.implied-structure": {
    "source": "iana"
  },
  "application/prs.nprend": {
    "source": "iana"
  },
  "application/prs.plucker": {
    "source": "iana"
  },
  "application/prs.rdf-xml-crypt": {
    "source": "iana"
  },
  "application/prs.vcfbzip2": {
    "source": "iana"
  },
  "application/prs.xsf+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xsf"
    ]
  },
  "application/pskc+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "pskcxml"
    ]
  },
  "application/pvd+json": {
    "source": "iana",
    "compressible": true
  },
  "application/qsig": {
    "source": "iana"
  },
  "application/raml+yaml": {
    "compressible": true,
    "extensions": [
      "raml"
    ]
  },
  "application/raptorfec": {
    "source": "iana"
  },
  "application/rdap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/rdf+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rdf",
      "owl"
    ]
  },
  "application/reginfo+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rif"
    ]
  },
  "application/relax-ng-compact-syntax": {
    "source": "iana",
    "extensions": [
      "rnc"
    ]
  },
  "application/remote-printing": {
    "source": "apache"
  },
  "application/reputon+json": {
    "source": "iana",
    "compressible": true
  },
  "application/resource-lists+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rl"
    ]
  },
  "application/resource-lists-diff+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rld"
    ]
  },
  "application/rfc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/riscos": {
    "source": "iana"
  },
  "application/rlmi+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/rls-services+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rs"
    ]
  },
  "application/route-apd+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rapd"
    ]
  },
  "application/route-s-tsid+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "sls"
    ]
  },
  "application/route-usd+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rusd"
    ]
  },
  "application/rpki-checklist": {
    "source": "iana"
  },
  "application/rpki-ghostbusters": {
    "source": "iana",
    "extensions": [
      "gbr"
    ]
  },
  "application/rpki-manifest": {
    "source": "iana",
    "extensions": [
      "mft"
    ]
  },
  "application/rpki-publication": {
    "source": "iana"
  },
  "application/rpki-roa": {
    "source": "iana",
    "extensions": [
      "roa"
    ]
  },
  "application/rpki-signed-tal": {
    "source": "iana"
  },
  "application/rpki-updown": {
    "source": "iana"
  },
  "application/rsd+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "rsd"
    ]
  },
  "application/rss+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "rss"
    ]
  },
  "application/rtf": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rtf"
    ]
  },
  "application/rtploopback": {
    "source": "iana"
  },
  "application/rtx": {
    "source": "iana"
  },
  "application/samlassertion+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/samlmetadata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/sarif+json": {
    "source": "iana",
    "compressible": true
  },
  "application/sarif-external-properties+json": {
    "source": "iana",
    "compressible": true
  },
  "application/sbe": {
    "source": "iana"
  },
  "application/sbml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "sbml"
    ]
  },
  "application/scaip+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/scim+json": {
    "source": "iana",
    "compressible": true
  },
  "application/scvp-cv-request": {
    "source": "iana",
    "extensions": [
      "scq"
    ]
  },
  "application/scvp-cv-response": {
    "source": "iana",
    "extensions": [
      "scs"
    ]
  },
  "application/scvp-vp-request": {
    "source": "iana",
    "extensions": [
      "spq"
    ]
  },
  "application/scvp-vp-response": {
    "source": "iana",
    "extensions": [
      "spp"
    ]
  },
  "application/sdp": {
    "source": "iana",
    "extensions": [
      "sdp"
    ]
  },
  "application/secevent+jwt": {
    "source": "iana"
  },
  "application/senml+cbor": {
    "source": "iana"
  },
  "application/senml+json": {
    "source": "iana",
    "compressible": true
  },
  "application/senml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "senmlx"
    ]
  },
  "application/senml-etch+cbor": {
    "source": "iana"
  },
  "application/senml-etch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/senml-exi": {
    "source": "iana"
  },
  "application/sensml+cbor": {
    "source": "iana"
  },
  "application/sensml+json": {
    "source": "iana",
    "compressible": true
  },
  "application/sensml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "sensmlx"
    ]
  },
  "application/sensml-exi": {
    "source": "iana"
  },
  "application/sep+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/sep-exi": {
    "source": "iana"
  },
  "application/session-info": {
    "source": "iana"
  },
  "application/set-payment": {
    "source": "iana"
  },
  "application/set-payment-initiation": {
    "source": "iana",
    "extensions": [
      "setpay"
    ]
  },
  "application/set-registration": {
    "source": "iana"
  },
  "application/set-registration-initiation": {
    "source": "iana",
    "extensions": [
      "setreg"
    ]
  },
  "application/sgml": {
    "source": "iana"
  },
  "application/sgml-open-catalog": {
    "source": "iana"
  },
  "application/shf+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "shf"
    ]
  },
  "application/sieve": {
    "source": "iana",
    "extensions": [
      "siv",
      "sieve"
    ]
  },
  "application/simple-filter+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/simple-message-summary": {
    "source": "iana"
  },
  "application/simplesymbolcontainer": {
    "source": "iana"
  },
  "application/sipc": {
    "source": "iana"
  },
  "application/slate": {
    "source": "iana"
  },
  "application/smil": {
    "source": "apache"
  },
  "application/smil+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "smi",
      "smil"
    ]
  },
  "application/smpte336m": {
    "source": "iana"
  },
  "application/soap+fastinfoset": {
    "source": "iana"
  },
  "application/soap+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/sparql-query": {
    "source": "iana",
    "extensions": [
      "rq"
    ]
  },
  "application/sparql-results+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "srx"
    ]
  },
  "application/spdx+json": {
    "source": "iana",
    "compressible": true
  },
  "application/spirits-event+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/sql": {
    "source": "iana",
    "extensions": [
      "sql"
    ]
  },
  "application/srgs": {
    "source": "iana",
    "extensions": [
      "gram"
    ]
  },
  "application/srgs+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "grxml"
    ]
  },
  "application/sru+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "sru"
    ]
  },
  "application/ssdl+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "ssdl"
    ]
  },
  "application/ssml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ssml"
    ]
  },
  "application/st2110-41": {
    "source": "iana"
  },
  "application/stix+json": {
    "source": "iana",
    "compressible": true
  },
  "application/stratum": {
    "source": "iana"
  },
  "application/swid+cbor": {
    "source": "iana"
  },
  "application/swid+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "swidtag"
    ]
  },
  "application/tamp-apex-update": {
    "source": "iana"
  },
  "application/tamp-apex-update-confirm": {
    "source": "iana"
  },
  "application/tamp-community-update": {
    "source": "iana"
  },
  "application/tamp-community-update-confirm": {
    "source": "iana"
  },
  "application/tamp-error": {
    "source": "iana"
  },
  "application/tamp-sequence-adjust": {
    "source": "iana"
  },
  "application/tamp-sequence-adjust-confirm": {
    "source": "iana"
  },
  "application/tamp-status-query": {
    "source": "iana"
  },
  "application/tamp-status-response": {
    "source": "iana"
  },
  "application/tamp-update": {
    "source": "iana"
  },
  "application/tamp-update-confirm": {
    "source": "iana"
  },
  "application/tar": {
    "compressible": true
  },
  "application/taxii+json": {
    "source": "iana",
    "compressible": true
  },
  "application/td+json": {
    "source": "iana",
    "compressible": true
  },
  "application/tei+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "tei",
      "teicorpus"
    ]
  },
  "application/tetra_isi": {
    "source": "iana"
  },
  "application/thraud+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "tfi"
    ]
  },
  "application/timestamp-query": {
    "source": "iana"
  },
  "application/timestamp-reply": {
    "source": "iana"
  },
  "application/timestamped-data": {
    "source": "iana",
    "extensions": [
      "tsd"
    ]
  },
  "application/tlsrpt+gzip": {
    "source": "iana"
  },
  "application/tlsrpt+json": {
    "source": "iana",
    "compressible": true
  },
  "application/tm+json": {
    "source": "iana",
    "compressible": true
  },
  "application/tnauthlist": {
    "source": "iana"
  },
  "application/token-introspection+jwt": {
    "source": "iana"
  },
  "application/toml": {
    "compressible": true,
    "extensions": [
      "toml"
    ]
  },
  "application/trickle-ice-sdpfrag": {
    "source": "iana"
  },
  "application/trig": {
    "source": "iana",
    "extensions": [
      "trig"
    ]
  },
  "application/ttml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ttml"
    ]
  },
  "application/tve-trigger": {
    "source": "iana"
  },
  "application/tzif": {
    "source": "iana"
  },
  "application/tzif-leap": {
    "source": "iana"
  },
  "application/ubjson": {
    "compressible": false,
    "extensions": [
      "ubj"
    ]
  },
  "application/ulpfec": {
    "source": "iana"
  },
  "application/urc-grpsheet+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/urc-ressheet+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rsheet"
    ]
  },
  "application/urc-targetdesc+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "td"
    ]
  },
  "application/urc-uisocketdesc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vc": {
    "source": "iana"
  },
  "application/vcard+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vcard+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vemmi": {
    "source": "iana"
  },
  "application/vividence.scriptfile": {
    "source": "apache"
  },
  "application/vnd.1000minds.decision-model+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "1km"
    ]
  },
  "application/vnd.1ob": {
    "source": "iana"
  },
  "application/vnd.3gpp-prose+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp-prose-pc3a+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp-prose-pc3ach+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp-prose-pc3ch+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp-prose-pc8+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp-v2x-local-service-information": {
    "source": "iana"
  },
  "application/vnd.3gpp.5gnas": {
    "source": "iana"
  },
  "application/vnd.3gpp.5gsa2x": {
    "source": "iana"
  },
  "application/vnd.3gpp.5gsa2x-local-service-information": {
    "source": "iana"
  },
  "application/vnd.3gpp.access-transfer-events+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.bsf+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.crs+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.current-location-discovery+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.gmop+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.gtpc": {
    "source": "iana"
  },
  "application/vnd.3gpp.interworking-data": {
    "source": "iana"
  },
  "application/vnd.3gpp.lpp": {
    "source": "iana"
  },
  "application/vnd.3gpp.mc-signalling-ear": {
    "source": "iana"
  },
  "application/vnd.3gpp.mcdata-affiliation-command+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-msgstore-ctrl-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-payload": {
    "source": "iana"
  },
  "application/vnd.3gpp.mcdata-regroup+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-service-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-signalling": {
    "source": "iana"
  },
  "application/vnd.3gpp.mcdata-ue-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcdata-user-profile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-affiliation-command+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-floor-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-location-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-regroup+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-service-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-signed+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-ue-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-ue-init-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcptt-user-profile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-location-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-regroup+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-service-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-transmission-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-ue-config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mcvideo-user-profile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.mid-call+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.ngap": {
    "source": "iana"
  },
  "application/vnd.3gpp.pfcp": {
    "source": "iana"
  },
  "application/vnd.3gpp.pic-bw-large": {
    "source": "iana",
    "extensions": [
      "plb"
    ]
  },
  "application/vnd.3gpp.pic-bw-small": {
    "source": "iana",
    "extensions": [
      "psb"
    ]
  },
  "application/vnd.3gpp.pic-bw-var": {
    "source": "iana",
    "extensions": [
      "pvb"
    ]
  },
  "application/vnd.3gpp.pinapp-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.s1ap": {
    "source": "iana"
  },
  "application/vnd.3gpp.seal-group-doc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-location-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-mbms-usage-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-network-qos-management-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-ue-config-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-unicast-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.seal-user-profile-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.sms": {
    "source": "iana"
  },
  "application/vnd.3gpp.sms+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.srvcc-ext+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.srvcc-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.state-and-event-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.ussd+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp.v2x": {
    "source": "iana"
  },
  "application/vnd.3gpp.vae-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp2.bcmcsinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.3gpp2.sms": {
    "source": "iana"
  },
  "application/vnd.3gpp2.tcap": {
    "source": "iana",
    "extensions": [
      "tcap"
    ]
  },
  "application/vnd.3lightssoftware.imagescal": {
    "source": "iana"
  },
  "application/vnd.3m.post-it-notes": {
    "source": "iana",
    "extensions": [
      "pwn"
    ]
  },
  "application/vnd.accpac.simply.aso": {
    "source": "iana",
    "extensions": [
      "aso"
    ]
  },
  "application/vnd.accpac.simply.imp": {
    "source": "iana",
    "extensions": [
      "imp"
    ]
  },
  "application/vnd.acm.addressxfer+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.acm.chatbot+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.acucobol": {
    "source": "iana",
    "extensions": [
      "acu"
    ]
  },
  "application/vnd.acucorp": {
    "source": "iana",
    "extensions": [
      "atc",
      "acutc"
    ]
  },
  "application/vnd.adobe.air-application-installer-package+zip": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "air"
    ]
  },
  "application/vnd.adobe.flash.movie": {
    "source": "iana"
  },
  "application/vnd.adobe.formscentral.fcdt": {
    "source": "iana",
    "extensions": [
      "fcdt"
    ]
  },
  "application/vnd.adobe.fxp": {
    "source": "iana",
    "extensions": [
      "fxp",
      "fxpl"
    ]
  },
  "application/vnd.adobe.partial-upload": {
    "source": "iana"
  },
  "application/vnd.adobe.xdp+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xdp"
    ]
  },
  "application/vnd.adobe.xfdf": {
    "source": "apache",
    "extensions": [
      "xfdf"
    ]
  },
  "application/vnd.aether.imp": {
    "source": "iana"
  },
  "application/vnd.afpc.afplinedata": {
    "source": "iana"
  },
  "application/vnd.afpc.afplinedata-pagedef": {
    "source": "iana"
  },
  "application/vnd.afpc.cmoca-cmresource": {
    "source": "iana"
  },
  "application/vnd.afpc.foca-charset": {
    "source": "iana"
  },
  "application/vnd.afpc.foca-codedfont": {
    "source": "iana"
  },
  "application/vnd.afpc.foca-codepage": {
    "source": "iana"
  },
  "application/vnd.afpc.modca": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-cmtable": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-formdef": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-mediummap": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-objectcontainer": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-overlay": {
    "source": "iana"
  },
  "application/vnd.afpc.modca-pagesegment": {
    "source": "iana"
  },
  "application/vnd.age": {
    "source": "iana",
    "extensions": [
      "age"
    ]
  },
  "application/vnd.ah-barcode": {
    "source": "apache"
  },
  "application/vnd.ahead.space": {
    "source": "iana",
    "extensions": [
      "ahead"
    ]
  },
  "application/vnd.airzip.filesecure.azf": {
    "source": "iana",
    "extensions": [
      "azf"
    ]
  },
  "application/vnd.airzip.filesecure.azs": {
    "source": "iana",
    "extensions": [
      "azs"
    ]
  },
  "application/vnd.amadeus+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.amazon.ebook": {
    "source": "apache",
    "extensions": [
      "azw"
    ]
  },
  "application/vnd.amazon.mobi8-ebook": {
    "source": "iana"
  },
  "application/vnd.americandynamics.acc": {
    "source": "iana",
    "extensions": [
      "acc"
    ]
  },
  "application/vnd.amiga.ami": {
    "source": "iana",
    "extensions": [
      "ami"
    ]
  },
  "application/vnd.amundsen.maze+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.android.ota": {
    "source": "iana"
  },
  "application/vnd.android.package-archive": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "apk"
    ]
  },
  "application/vnd.anki": {
    "source": "iana"
  },
  "application/vnd.anser-web-certificate-issue-initiation": {
    "source": "iana",
    "extensions": [
      "cii"
    ]
  },
  "application/vnd.anser-web-funds-transfer-initiation": {
    "source": "apache",
    "extensions": [
      "fti"
    ]
  },
  "application/vnd.antix.game-component": {
    "source": "iana",
    "extensions": [
      "atx"
    ]
  },
  "application/vnd.apache.arrow.file": {
    "source": "iana"
  },
  "application/vnd.apache.arrow.stream": {
    "source": "iana"
  },
  "application/vnd.apache.parquet": {
    "source": "iana"
  },
  "application/vnd.apache.thrift.binary": {
    "source": "iana"
  },
  "application/vnd.apache.thrift.compact": {
    "source": "iana"
  },
  "application/vnd.apache.thrift.json": {
    "source": "iana"
  },
  "application/vnd.apexlang": {
    "source": "iana"
  },
  "application/vnd.api+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.aplextor.warrp+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.apothekende.reservation+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.apple.installer+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mpkg"
    ]
  },
  "application/vnd.apple.keynote": {
    "source": "iana",
    "extensions": [
      "key"
    ]
  },
  "application/vnd.apple.mpegurl": {
    "source": "iana",
    "extensions": [
      "m3u8"
    ]
  },
  "application/vnd.apple.numbers": {
    "source": "iana",
    "extensions": [
      "numbers"
    ]
  },
  "application/vnd.apple.pages": {
    "source": "iana",
    "extensions": [
      "pages"
    ]
  },
  "application/vnd.apple.pkpass": {
    "compressible": false,
    "extensions": [
      "pkpass"
    ]
  },
  "application/vnd.arastra.swi": {
    "source": "apache"
  },
  "application/vnd.aristanetworks.swi": {
    "source": "iana",
    "extensions": [
      "swi"
    ]
  },
  "application/vnd.artisan+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.artsquare": {
    "source": "iana"
  },
  "application/vnd.astraea-software.iota": {
    "source": "iana",
    "extensions": [
      "iota"
    ]
  },
  "application/vnd.audiograph": {
    "source": "iana",
    "extensions": [
      "aep"
    ]
  },
  "application/vnd.autopackage": {
    "source": "iana"
  },
  "application/vnd.avalon+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.avistar+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.balsamiq.bmml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "bmml"
    ]
  },
  "application/vnd.balsamiq.bmpr": {
    "source": "iana"
  },
  "application/vnd.banana-accounting": {
    "source": "iana"
  },
  "application/vnd.bbf.usp.error": {
    "source": "iana"
  },
  "application/vnd.bbf.usp.msg": {
    "source": "iana"
  },
  "application/vnd.bbf.usp.msg+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.bekitzur-stech+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.belightsoft.lhzd+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.belightsoft.lhzl+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.bint.med-content": {
    "source": "iana"
  },
  "application/vnd.biopax.rdf+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.blink-idb-value-wrapper": {
    "source": "iana"
  },
  "application/vnd.blueice.multipass": {
    "source": "iana",
    "extensions": [
      "mpm"
    ]
  },
  "application/vnd.bluetooth.ep.oob": {
    "source": "iana"
  },
  "application/vnd.bluetooth.le.oob": {
    "source": "iana"
  },
  "application/vnd.bmi": {
    "source": "iana",
    "extensions": [
      "bmi"
    ]
  },
  "application/vnd.bpf": {
    "source": "iana"
  },
  "application/vnd.bpf3": {
    "source": "iana"
  },
  "application/vnd.businessobjects": {
    "source": "iana",
    "extensions": [
      "rep"
    ]
  },
  "application/vnd.byu.uapi+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.bzip3": {
    "source": "iana"
  },
  "application/vnd.c3voc.schedule+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cab-jscript": {
    "source": "iana"
  },
  "application/vnd.canon-cpdl": {
    "source": "iana"
  },
  "application/vnd.canon-lips": {
    "source": "iana"
  },
  "application/vnd.capasystems-pg+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cendio.thinlinc.clientconf": {
    "source": "iana"
  },
  "application/vnd.century-systems.tcp_stream": {
    "source": "iana"
  },
  "application/vnd.chemdraw+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "cdxml"
    ]
  },
  "application/vnd.chess-pgn": {
    "source": "iana"
  },
  "application/vnd.chipnuts.karaoke-mmd": {
    "source": "iana",
    "extensions": [
      "mmd"
    ]
  },
  "application/vnd.ciedi": {
    "source": "iana"
  },
  "application/vnd.cinderella": {
    "source": "iana",
    "extensions": [
      "cdy"
    ]
  },
  "application/vnd.cirpack.isdn-ext": {
    "source": "iana"
  },
  "application/vnd.citationstyles.style+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "csl"
    ]
  },
  "application/vnd.claymore": {
    "source": "iana",
    "extensions": [
      "cla"
    ]
  },
  "application/vnd.cloanto.rp9": {
    "source": "iana",
    "extensions": [
      "rp9"
    ]
  },
  "application/vnd.clonk.c4group": {
    "source": "iana",
    "extensions": [
      "c4g",
      "c4d",
      "c4f",
      "c4p",
      "c4u"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config": {
    "source": "iana",
    "extensions": [
      "c11amc"
    ]
  },
  "application/vnd.cluetrust.cartomobile-config-pkg": {
    "source": "iana",
    "extensions": [
      "c11amz"
    ]
  },
  "application/vnd.cncf.helm.chart.content.v1.tar+gzip": {
    "source": "iana"
  },
  "application/vnd.cncf.helm.chart.provenance.v1.prov": {
    "source": "iana"
  },
  "application/vnd.cncf.helm.config.v1+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.coffeescript": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.document": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.document-template": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.presentation": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.presentation-template": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet": {
    "source": "iana"
  },
  "application/vnd.collabio.xodocuments.spreadsheet-template": {
    "source": "iana"
  },
  "application/vnd.collection+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.collection.doc+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.collection.next+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.comicbook+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.comicbook-rar": {
    "source": "iana"
  },
  "application/vnd.commerce-battelle": {
    "source": "iana"
  },
  "application/vnd.commonspace": {
    "source": "iana",
    "extensions": [
      "csp"
    ]
  },
  "application/vnd.contact.cmsg": {
    "source": "iana",
    "extensions": [
      "cdbcmsg"
    ]
  },
  "application/vnd.coreos.ignition+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cosmocaller": {
    "source": "iana",
    "extensions": [
      "cmc"
    ]
  },
  "application/vnd.crick.clicker": {
    "source": "iana",
    "extensions": [
      "clkx"
    ]
  },
  "application/vnd.crick.clicker.keyboard": {
    "source": "iana",
    "extensions": [
      "clkk"
    ]
  },
  "application/vnd.crick.clicker.palette": {
    "source": "iana",
    "extensions": [
      "clkp"
    ]
  },
  "application/vnd.crick.clicker.template": {
    "source": "iana",
    "extensions": [
      "clkt"
    ]
  },
  "application/vnd.crick.clicker.wordbank": {
    "source": "iana",
    "extensions": [
      "clkw"
    ]
  },
  "application/vnd.criticaltools.wbs+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wbs"
    ]
  },
  "application/vnd.cryptii.pipe+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.crypto-shade-file": {
    "source": "iana"
  },
  "application/vnd.cryptomator.encrypted": {
    "source": "iana"
  },
  "application/vnd.cryptomator.vault": {
    "source": "iana"
  },
  "application/vnd.ctc-posml": {
    "source": "iana",
    "extensions": [
      "pml"
    ]
  },
  "application/vnd.ctct.ws+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cups-pdf": {
    "source": "iana"
  },
  "application/vnd.cups-postscript": {
    "source": "iana"
  },
  "application/vnd.cups-ppd": {
    "source": "iana",
    "extensions": [
      "ppd"
    ]
  },
  "application/vnd.cups-raster": {
    "source": "iana"
  },
  "application/vnd.cups-raw": {
    "source": "iana"
  },
  "application/vnd.curl": {
    "source": "iana"
  },
  "application/vnd.curl.car": {
    "source": "apache",
    "extensions": [
      "car"
    ]
  },
  "application/vnd.curl.pcurl": {
    "source": "apache",
    "extensions": [
      "pcurl"
    ]
  },
  "application/vnd.cyan.dean.root+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cybank": {
    "source": "iana"
  },
  "application/vnd.cyclonedx+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.cyclonedx+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.d2l.coursepackage1p0+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.d3m-dataset": {
    "source": "iana"
  },
  "application/vnd.d3m-problem": {
    "source": "iana"
  },
  "application/vnd.dart": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "dart"
    ]
  },
  "application/vnd.data-vision.rdz": {
    "source": "iana",
    "extensions": [
      "rdz"
    ]
  },
  "application/vnd.datalog": {
    "source": "iana"
  },
  "application/vnd.datapackage+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dataresource+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dbf": {
    "source": "iana",
    "extensions": [
      "dbf"
    ]
  },
  "application/vnd.debian.binary-package": {
    "source": "iana"
  },
  "application/vnd.dece.data": {
    "source": "iana",
    "extensions": [
      "uvf",
      "uvvf",
      "uvd",
      "uvvd"
    ]
  },
  "application/vnd.dece.ttml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "uvt",
      "uvvt"
    ]
  },
  "application/vnd.dece.unspecified": {
    "source": "iana",
    "extensions": [
      "uvx",
      "uvvx"
    ]
  },
  "application/vnd.dece.zip": {
    "source": "iana",
    "extensions": [
      "uvz",
      "uvvz"
    ]
  },
  "application/vnd.denovo.fcselayout-link": {
    "source": "iana",
    "extensions": [
      "fe_launch"
    ]
  },
  "application/vnd.desmume.movie": {
    "source": "iana"
  },
  "application/vnd.dir-bi.plate-dl-nosuffix": {
    "source": "iana"
  },
  "application/vnd.dm.delegation+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dna": {
    "source": "iana",
    "extensions": [
      "dna"
    ]
  },
  "application/vnd.document+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dolby.mlp": {
    "source": "apache",
    "extensions": [
      "mlp"
    ]
  },
  "application/vnd.dolby.mobile.1": {
    "source": "iana"
  },
  "application/vnd.dolby.mobile.2": {
    "source": "iana"
  },
  "application/vnd.doremir.scorecloud-binary-document": {
    "source": "iana"
  },
  "application/vnd.dpgraph": {
    "source": "iana",
    "extensions": [
      "dpg"
    ]
  },
  "application/vnd.dreamfactory": {
    "source": "iana",
    "extensions": [
      "dfac"
    ]
  },
  "application/vnd.drive+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ds-keypoint": {
    "source": "apache",
    "extensions": [
      "kpxx"
    ]
  },
  "application/vnd.dtg.local": {
    "source": "iana"
  },
  "application/vnd.dtg.local.flash": {
    "source": "iana"
  },
  "application/vnd.dtg.local.html": {
    "source": "iana"
  },
  "application/vnd.dvb.ait": {
    "source": "iana",
    "extensions": [
      "ait"
    ]
  },
  "application/vnd.dvb.dvbisl+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.dvbj": {
    "source": "iana"
  },
  "application/vnd.dvb.esgcontainer": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcdftnotifaccess": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgaccess": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgaccess2": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcesgpdd": {
    "source": "iana"
  },
  "application/vnd.dvb.ipdcroaming": {
    "source": "iana"
  },
  "application/vnd.dvb.iptv.alfec-base": {
    "source": "iana"
  },
  "application/vnd.dvb.iptv.alfec-enhancement": {
    "source": "iana"
  },
  "application/vnd.dvb.notif-aggregate-root+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-container+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-generic+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-ia-msglist+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-ia-registration-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-ia-registration-response+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.notif-init+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.dvb.pfr": {
    "source": "iana"
  },
  "application/vnd.dvb.service": {
    "source": "iana",
    "extensions": [
      "svc"
    ]
  },
  "application/vnd.dxr": {
    "source": "iana"
  },
  "application/vnd.dynageo": {
    "source": "iana",
    "extensions": [
      "geo"
    ]
  },
  "application/vnd.dzr": {
    "source": "iana"
  },
  "application/vnd.easykaraoke.cdgdownload": {
    "source": "iana"
  },
  "application/vnd.ecdis-update": {
    "source": "iana"
  },
  "application/vnd.ecip.rlp": {
    "source": "iana"
  },
  "application/vnd.eclipse.ditto+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ecowin.chart": {
    "source": "iana",
    "extensions": [
      "mag"
    ]
  },
  "application/vnd.ecowin.filerequest": {
    "source": "iana"
  },
  "application/vnd.ecowin.fileupdate": {
    "source": "iana"
  },
  "application/vnd.ecowin.series": {
    "source": "iana"
  },
  "application/vnd.ecowin.seriesrequest": {
    "source": "iana"
  },
  "application/vnd.ecowin.seriesupdate": {
    "source": "iana"
  },
  "application/vnd.efi.img": {
    "source": "iana"
  },
  "application/vnd.efi.iso": {
    "source": "iana"
  },
  "application/vnd.eln+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.emclient.accessrequest+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.enliven": {
    "source": "iana",
    "extensions": [
      "nml"
    ]
  },
  "application/vnd.enphase.envoy": {
    "source": "iana"
  },
  "application/vnd.eprints.data+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.epson.esf": {
    "source": "iana",
    "extensions": [
      "esf"
    ]
  },
  "application/vnd.epson.msf": {
    "source": "iana",
    "extensions": [
      "msf"
    ]
  },
  "application/vnd.epson.quickanime": {
    "source": "iana",
    "extensions": [
      "qam"
    ]
  },
  "application/vnd.epson.salt": {
    "source": "iana",
    "extensions": [
      "slt"
    ]
  },
  "application/vnd.epson.ssf": {
    "source": "iana",
    "extensions": [
      "ssf"
    ]
  },
  "application/vnd.ericsson.quickcall": {
    "source": "iana"
  },
  "application/vnd.erofs": {
    "source": "iana"
  },
  "application/vnd.espass-espass+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.eszigno3+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "es3",
      "et3"
    ]
  },
  "application/vnd.etsi.aoc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.asic-e+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.etsi.asic-s+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.etsi.cug+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvcommand+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvdiscovery+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvprofile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvsad-bc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvsad-cod+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvsad-npvr+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvservice+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvsync+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.iptvueprofile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.mcid+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.mheg5": {
    "source": "iana"
  },
  "application/vnd.etsi.overload-control-policy-dataset+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.pstn+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.sci+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.simservs+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.timestamp-token": {
    "source": "iana"
  },
  "application/vnd.etsi.tsl+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.etsi.tsl.der": {
    "source": "iana"
  },
  "application/vnd.eu.kasparian.car+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.eudora.data": {
    "source": "iana"
  },
  "application/vnd.evolv.ecig.profile": {
    "source": "iana"
  },
  "application/vnd.evolv.ecig.settings": {
    "source": "iana"
  },
  "application/vnd.evolv.ecig.theme": {
    "source": "iana"
  },
  "application/vnd.exstream-empower+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.exstream-package": {
    "source": "iana"
  },
  "application/vnd.ezpix-album": {
    "source": "iana",
    "extensions": [
      "ez2"
    ]
  },
  "application/vnd.ezpix-package": {
    "source": "iana",
    "extensions": [
      "ez3"
    ]
  },
  "application/vnd.f-secure.mobile": {
    "source": "iana"
  },
  "application/vnd.familysearch.gedcom+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.fastcopy-disk-image": {
    "source": "iana"
  },
  "application/vnd.fdf": {
    "source": "apache",
    "extensions": [
      "fdf"
    ]
  },
  "application/vnd.fdsn.mseed": {
    "source": "iana",
    "extensions": [
      "mseed"
    ]
  },
  "application/vnd.fdsn.seed": {
    "source": "iana",
    "extensions": [
      "seed",
      "dataless"
    ]
  },
  "application/vnd.ffsns": {
    "source": "iana"
  },
  "application/vnd.ficlab.flb+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.filmit.zfc": {
    "source": "iana"
  },
  "application/vnd.fints": {
    "source": "iana"
  },
  "application/vnd.firemonkeys.cloudcell": {
    "source": "iana"
  },
  "application/vnd.flographit": {
    "source": "iana",
    "extensions": [
      "gph"
    ]
  },
  "application/vnd.fluxtime.clip": {
    "source": "iana",
    "extensions": [
      "ftc"
    ]
  },
  "application/vnd.font-fontforge-sfd": {
    "source": "iana"
  },
  "application/vnd.framemaker": {
    "source": "iana",
    "extensions": [
      "fm",
      "frame",
      "maker",
      "book"
    ]
  },
  "application/vnd.freelog.comic": {
    "source": "iana"
  },
  "application/vnd.frogans.fnc": {
    "source": "apache",
    "extensions": [
      "fnc"
    ]
  },
  "application/vnd.frogans.ltf": {
    "source": "apache",
    "extensions": [
      "ltf"
    ]
  },
  "application/vnd.fsc.weblaunch": {
    "source": "iana",
    "extensions": [
      "fsc"
    ]
  },
  "application/vnd.fujifilm.fb.docuworks": {
    "source": "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.binder": {
    "source": "iana"
  },
  "application/vnd.fujifilm.fb.docuworks.container": {
    "source": "iana"
  },
  "application/vnd.fujifilm.fb.jfi+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.fujitsu.oasys": {
    "source": "iana",
    "extensions": [
      "oas"
    ]
  },
  "application/vnd.fujitsu.oasys2": {
    "source": "iana",
    "extensions": [
      "oa2"
    ]
  },
  "application/vnd.fujitsu.oasys3": {
    "source": "iana",
    "extensions": [
      "oa3"
    ]
  },
  "application/vnd.fujitsu.oasysgp": {
    "source": "iana",
    "extensions": [
      "fg5"
    ]
  },
  "application/vnd.fujitsu.oasysprs": {
    "source": "iana",
    "extensions": [
      "bh2"
    ]
  },
  "application/vnd.fujixerox.art-ex": {
    "source": "iana"
  },
  "application/vnd.fujixerox.art4": {
    "source": "iana"
  },
  "application/vnd.fujixerox.ddd": {
    "source": "iana",
    "extensions": [
      "ddd"
    ]
  },
  "application/vnd.fujixerox.docuworks": {
    "source": "iana",
    "extensions": [
      "xdw"
    ]
  },
  "application/vnd.fujixerox.docuworks.binder": {
    "source": "iana",
    "extensions": [
      "xbd"
    ]
  },
  "application/vnd.fujixerox.docuworks.container": {
    "source": "iana"
  },
  "application/vnd.fujixerox.hbpl": {
    "source": "iana"
  },
  "application/vnd.fut-misnet": {
    "source": "iana"
  },
  "application/vnd.futoin+cbor": {
    "source": "iana"
  },
  "application/vnd.futoin+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.fuzzysheet": {
    "source": "iana",
    "extensions": [
      "fzs"
    ]
  },
  "application/vnd.ga4gh.passport+jwt": {
    "source": "iana"
  },
  "application/vnd.genomatix.tuxedo": {
    "source": "iana",
    "extensions": [
      "txd"
    ]
  },
  "application/vnd.genozip": {
    "source": "iana"
  },
  "application/vnd.gentics.grd+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.gentoo.catmetadata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.gentoo.ebuild": {
    "source": "iana"
  },
  "application/vnd.gentoo.eclass": {
    "source": "iana"
  },
  "application/vnd.gentoo.gpkg": {
    "source": "iana"
  },
  "application/vnd.gentoo.manifest": {
    "source": "iana"
  },
  "application/vnd.gentoo.pkgmetadata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.gentoo.xpak": {
    "source": "iana"
  },
  "application/vnd.geo+json": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.geocube+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.geogebra.file": {
    "source": "iana",
    "extensions": [
      "ggb"
    ]
  },
  "application/vnd.geogebra.slides": {
    "source": "iana",
    "extensions": [
      "ggs"
    ]
  },
  "application/vnd.geogebra.tool": {
    "source": "iana",
    "extensions": [
      "ggt"
    ]
  },
  "application/vnd.geometry-explorer": {
    "source": "iana",
    "extensions": [
      "gex",
      "gre"
    ]
  },
  "application/vnd.geonext": {
    "source": "iana",
    "extensions": [
      "gxt"
    ]
  },
  "application/vnd.geoplan": {
    "source": "iana",
    "extensions": [
      "g2w"
    ]
  },
  "application/vnd.geospace": {
    "source": "iana",
    "extensions": [
      "g3w"
    ]
  },
  "application/vnd.gerber": {
    "source": "iana"
  },
  "application/vnd.globalplatform.card-content-mgt": {
    "source": "iana"
  },
  "application/vnd.globalplatform.card-content-mgt-response": {
    "source": "iana"
  },
  "application/vnd.gmx": {
    "source": "iana",
    "extensions": [
      "gmx"
    ]
  },
  "application/vnd.gnu.taler.exchange+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.gnu.taler.merchant+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.google-apps.document": {
    "compressible": false,
    "extensions": [
      "gdoc"
    ]
  },
  "application/vnd.google-apps.presentation": {
    "compressible": false,
    "extensions": [
      "gslides"
    ]
  },
  "application/vnd.google-apps.spreadsheet": {
    "compressible": false,
    "extensions": [
      "gsheet"
    ]
  },
  "application/vnd.google-earth.kml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "kml"
    ]
  },
  "application/vnd.google-earth.kmz": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "kmz"
    ]
  },
  "application/vnd.gov.sk.e-form+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.gov.sk.e-form+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.gov.sk.xmldatacontainer+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xdcf"
    ]
  },
  "application/vnd.gpxsee.map+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.grafeq": {
    "source": "iana",
    "extensions": [
      "gqf",
      "gqs"
    ]
  },
  "application/vnd.gridmp": {
    "source": "iana"
  },
  "application/vnd.groove-account": {
    "source": "iana",
    "extensions": [
      "gac"
    ]
  },
  "application/vnd.groove-help": {
    "source": "iana",
    "extensions": [
      "ghf"
    ]
  },
  "application/vnd.groove-identity-message": {
    "source": "iana",
    "extensions": [
      "gim"
    ]
  },
  "application/vnd.groove-injector": {
    "source": "iana",
    "extensions": [
      "grv"
    ]
  },
  "application/vnd.groove-tool-message": {
    "source": "iana",
    "extensions": [
      "gtm"
    ]
  },
  "application/vnd.groove-tool-template": {
    "source": "iana",
    "extensions": [
      "tpl"
    ]
  },
  "application/vnd.groove-vcard": {
    "source": "iana",
    "extensions": [
      "vcg"
    ]
  },
  "application/vnd.hal+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hal+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "hal"
    ]
  },
  "application/vnd.handheld-entertainment+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "zmm"
    ]
  },
  "application/vnd.hbci": {
    "source": "iana",
    "extensions": [
      "hbci"
    ]
  },
  "application/vnd.hc+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hcl-bireports": {
    "source": "iana"
  },
  "application/vnd.hdt": {
    "source": "iana"
  },
  "application/vnd.heroku+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hhe.lesson-player": {
    "source": "iana",
    "extensions": [
      "les"
    ]
  },
  "application/vnd.hp-hpgl": {
    "source": "iana",
    "extensions": [
      "hpgl"
    ]
  },
  "application/vnd.hp-hpid": {
    "source": "iana",
    "extensions": [
      "hpid"
    ]
  },
  "application/vnd.hp-hps": {
    "source": "iana",
    "extensions": [
      "hps"
    ]
  },
  "application/vnd.hp-jlyt": {
    "source": "iana",
    "extensions": [
      "jlt"
    ]
  },
  "application/vnd.hp-pcl": {
    "source": "iana",
    "extensions": [
      "pcl"
    ]
  },
  "application/vnd.hp-pclxl": {
    "source": "iana",
    "extensions": [
      "pclxl"
    ]
  },
  "application/vnd.hsl": {
    "source": "iana"
  },
  "application/vnd.httphone": {
    "source": "iana"
  },
  "application/vnd.hydrostatix.sof-data": {
    "source": "iana",
    "extensions": [
      "sfd-hdstx"
    ]
  },
  "application/vnd.hyper+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hyper-item+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hyperdrive+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.hzn-3d-crossword": {
    "source": "iana"
  },
  "application/vnd.ibm.afplinedata": {
    "source": "apache"
  },
  "application/vnd.ibm.electronic-media": {
    "source": "iana"
  },
  "application/vnd.ibm.minipay": {
    "source": "iana",
    "extensions": [
      "mpy"
    ]
  },
  "application/vnd.ibm.modcap": {
    "source": "apache",
    "extensions": [
      "afp",
      "listafp",
      "list3820"
    ]
  },
  "application/vnd.ibm.rights-management": {
    "source": "iana",
    "extensions": [
      "irm"
    ]
  },
  "application/vnd.ibm.secure-container": {
    "source": "iana",
    "extensions": [
      "sc"
    ]
  },
  "application/vnd.iccprofile": {
    "source": "iana",
    "extensions": [
      "icc",
      "icm"
    ]
  },
  "application/vnd.ieee.1905": {
    "source": "iana"
  },
  "application/vnd.igloader": {
    "source": "iana",
    "extensions": [
      "igl"
    ]
  },
  "application/vnd.imagemeter.folder+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.imagemeter.image+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.immervision-ivp": {
    "source": "iana",
    "extensions": [
      "ivp"
    ]
  },
  "application/vnd.immervision-ivu": {
    "source": "iana",
    "extensions": [
      "ivu"
    ]
  },
  "application/vnd.ims.imsccv1p1": {
    "source": "iana"
  },
  "application/vnd.ims.imsccv1p2": {
    "source": "iana"
  },
  "application/vnd.ims.imsccv1p3": {
    "source": "iana"
  },
  "application/vnd.ims.lis.v2.result+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolproxy+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolproxy.id+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolsettings+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ims.lti.v2.toolsettings.simple+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.informedcontrol.rms+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.informix-visionary": {
    "source": "apache"
  },
  "application/vnd.infotech.project": {
    "source": "iana"
  },
  "application/vnd.infotech.project+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.innopath.wamp.notification": {
    "source": "iana"
  },
  "application/vnd.insors.igm": {
    "source": "iana",
    "extensions": [
      "igm"
    ]
  },
  "application/vnd.intercon.formnet": {
    "source": "iana",
    "extensions": [
      "xpw",
      "xpx"
    ]
  },
  "application/vnd.intergeo": {
    "source": "iana",
    "extensions": [
      "i2g"
    ]
  },
  "application/vnd.intertrust.digibox": {
    "source": "iana"
  },
  "application/vnd.intertrust.nncp": {
    "source": "iana"
  },
  "application/vnd.intu.qbo": {
    "source": "iana",
    "extensions": [
      "qbo"
    ]
  },
  "application/vnd.intu.qfx": {
    "source": "iana",
    "extensions": [
      "qfx"
    ]
  },
  "application/vnd.ipfs.ipns-record": {
    "source": "iana"
  },
  "application/vnd.ipld.car": {
    "source": "iana"
  },
  "application/vnd.ipld.dag-cbor": {
    "source": "iana"
  },
  "application/vnd.ipld.dag-json": {
    "source": "iana"
  },
  "application/vnd.ipld.raw": {
    "source": "iana"
  },
  "application/vnd.iptc.g2.catalogitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.conceptitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.knowledgeitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.newsitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.newsmessage+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.packageitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.iptc.g2.planningitem+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ipunplugged.rcprofile": {
    "source": "iana",
    "extensions": [
      "rcprofile"
    ]
  },
  "application/vnd.irepository.package+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "irp"
    ]
  },
  "application/vnd.is-xpr": {
    "source": "iana",
    "extensions": [
      "xpr"
    ]
  },
  "application/vnd.isac.fcs": {
    "source": "iana",
    "extensions": [
      "fcs"
    ]
  },
  "application/vnd.iso11783-10+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.jam": {
    "source": "iana",
    "extensions": [
      "jam"
    ]
  },
  "application/vnd.japannet-directory-service": {
    "source": "iana"
  },
  "application/vnd.japannet-jpnstore-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-payment-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-registration": {
    "source": "iana"
  },
  "application/vnd.japannet-registration-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-setstore-wakeup": {
    "source": "iana"
  },
  "application/vnd.japannet-verification": {
    "source": "iana"
  },
  "application/vnd.japannet-verification-wakeup": {
    "source": "iana"
  },
  "application/vnd.jcp.javame.midlet-rms": {
    "source": "iana",
    "extensions": [
      "rms"
    ]
  },
  "application/vnd.jisp": {
    "source": "iana",
    "extensions": [
      "jisp"
    ]
  },
  "application/vnd.joost.joda-archive": {
    "source": "iana",
    "extensions": [
      "joda"
    ]
  },
  "application/vnd.jsk.isdn-ngn": {
    "source": "iana"
  },
  "application/vnd.kahootz": {
    "source": "iana",
    "extensions": [
      "ktz",
      "ktr"
    ]
  },
  "application/vnd.kde.karbon": {
    "source": "iana",
    "extensions": [
      "karbon"
    ]
  },
  "application/vnd.kde.kchart": {
    "source": "iana",
    "extensions": [
      "chrt"
    ]
  },
  "application/vnd.kde.kformula": {
    "source": "iana",
    "extensions": [
      "kfo"
    ]
  },
  "application/vnd.kde.kivio": {
    "source": "iana",
    "extensions": [
      "flw"
    ]
  },
  "application/vnd.kde.kontour": {
    "source": "iana",
    "extensions": [
      "kon"
    ]
  },
  "application/vnd.kde.kpresenter": {
    "source": "iana",
    "extensions": [
      "kpr",
      "kpt"
    ]
  },
  "application/vnd.kde.kspread": {
    "source": "iana",
    "extensions": [
      "ksp"
    ]
  },
  "application/vnd.kde.kword": {
    "source": "iana",
    "extensions": [
      "kwd",
      "kwt"
    ]
  },
  "application/vnd.kenameaapp": {
    "source": "iana",
    "extensions": [
      "htke"
    ]
  },
  "application/vnd.kidspiration": {
    "source": "iana",
    "extensions": [
      "kia"
    ]
  },
  "application/vnd.kinar": {
    "source": "iana",
    "extensions": [
      "kne",
      "knp"
    ]
  },
  "application/vnd.koan": {
    "source": "iana",
    "extensions": [
      "skp",
      "skd",
      "skt",
      "skm"
    ]
  },
  "application/vnd.kodak-descriptor": {
    "source": "iana",
    "extensions": [
      "sse"
    ]
  },
  "application/vnd.las": {
    "source": "iana"
  },
  "application/vnd.las.las+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.las.las+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "lasxml"
    ]
  },
  "application/vnd.laszip": {
    "source": "iana"
  },
  "application/vnd.ldev.productlicensing": {
    "source": "iana"
  },
  "application/vnd.leap+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.liberty-request+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.llamagraphics.life-balance.desktop": {
    "source": "iana",
    "extensions": [
      "lbd"
    ]
  },
  "application/vnd.llamagraphics.life-balance.exchange+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "lbe"
    ]
  },
  "application/vnd.logipipe.circuit+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.loom": {
    "source": "iana"
  },
  "application/vnd.lotus-1-2-3": {
    "source": "iana",
    "extensions": [
      "123"
    ]
  },
  "application/vnd.lotus-approach": {
    "source": "iana",
    "extensions": [
      "apr"
    ]
  },
  "application/vnd.lotus-freelance": {
    "source": "iana",
    "extensions": [
      "pre"
    ]
  },
  "application/vnd.lotus-notes": {
    "source": "iana",
    "extensions": [
      "nsf"
    ]
  },
  "application/vnd.lotus-organizer": {
    "source": "iana",
    "extensions": [
      "org"
    ]
  },
  "application/vnd.lotus-screencam": {
    "source": "iana",
    "extensions": [
      "scm"
    ]
  },
  "application/vnd.lotus-wordpro": {
    "source": "iana",
    "extensions": [
      "lwp"
    ]
  },
  "application/vnd.macports.portpkg": {
    "source": "iana",
    "extensions": [
      "portpkg"
    ]
  },
  "application/vnd.mapbox-vector-tile": {
    "source": "iana",
    "extensions": [
      "mvt"
    ]
  },
  "application/vnd.marlin.drm.actiontoken+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.marlin.drm.conftoken+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.marlin.drm.license+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.marlin.drm.mdcf": {
    "source": "iana"
  },
  "application/vnd.mason+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.maxar.archive.3tz+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.maxmind.maxmind-db": {
    "source": "iana"
  },
  "application/vnd.mcd": {
    "source": "iana",
    "extensions": [
      "mcd"
    ]
  },
  "application/vnd.mdl": {
    "source": "iana"
  },
  "application/vnd.mdl-mbsdf": {
    "source": "iana"
  },
  "application/vnd.medcalcdata": {
    "source": "iana",
    "extensions": [
      "mc1"
    ]
  },
  "application/vnd.mediastation.cdkey": {
    "source": "iana",
    "extensions": [
      "cdkey"
    ]
  },
  "application/vnd.medicalholodeck.recordxr": {
    "source": "iana"
  },
  "application/vnd.meridian-slingshot": {
    "source": "iana"
  },
  "application/vnd.mermaid": {
    "source": "iana"
  },
  "application/vnd.mfer": {
    "source": "iana",
    "extensions": [
      "mwf"
    ]
  },
  "application/vnd.mfmp": {
    "source": "iana",
    "extensions": [
      "mfm"
    ]
  },
  "application/vnd.micro+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.micrografx.flo": {
    "source": "iana",
    "extensions": [
      "flo"
    ]
  },
  "application/vnd.micrografx.igx": {
    "source": "iana",
    "extensions": [
      "igx"
    ]
  },
  "application/vnd.microsoft.portable-executable": {
    "source": "iana"
  },
  "application/vnd.microsoft.windows.thumbnail-cache": {
    "source": "iana"
  },
  "application/vnd.miele+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.mif": {
    "source": "iana",
    "extensions": [
      "mif"
    ]
  },
  "application/vnd.minisoft-hp3000-save": {
    "source": "iana"
  },
  "application/vnd.mitsubishi.misty-guard.trustweb": {
    "source": "iana"
  },
  "application/vnd.mobius.daf": {
    "source": "iana",
    "extensions": [
      "daf"
    ]
  },
  "application/vnd.mobius.dis": {
    "source": "iana",
    "extensions": [
      "dis"
    ]
  },
  "application/vnd.mobius.mbk": {
    "source": "iana",
    "extensions": [
      "mbk"
    ]
  },
  "application/vnd.mobius.mqy": {
    "source": "iana",
    "extensions": [
      "mqy"
    ]
  },
  "application/vnd.mobius.msl": {
    "source": "iana",
    "extensions": [
      "msl"
    ]
  },
  "application/vnd.mobius.plc": {
    "source": "iana",
    "extensions": [
      "plc"
    ]
  },
  "application/vnd.mobius.txf": {
    "source": "iana",
    "extensions": [
      "txf"
    ]
  },
  "application/vnd.modl": {
    "source": "iana"
  },
  "application/vnd.mophun.application": {
    "source": "iana",
    "extensions": [
      "mpn"
    ]
  },
  "application/vnd.mophun.certificate": {
    "source": "iana",
    "extensions": [
      "mpc"
    ]
  },
  "application/vnd.motorola.flexsuite": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.adsi": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.fis": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.gotap": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.kmr": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.ttc": {
    "source": "iana"
  },
  "application/vnd.motorola.flexsuite.wem": {
    "source": "iana"
  },
  "application/vnd.motorola.iprm": {
    "source": "iana"
  },
  "application/vnd.mozilla.xul+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xul"
    ]
  },
  "application/vnd.ms-3mfdocument": {
    "source": "iana"
  },
  "application/vnd.ms-artgalry": {
    "source": "iana",
    "extensions": [
      "cil"
    ]
  },
  "application/vnd.ms-asf": {
    "source": "iana"
  },
  "application/vnd.ms-cab-compressed": {
    "source": "iana",
    "extensions": [
      "cab"
    ]
  },
  "application/vnd.ms-color.iccprofile": {
    "source": "apache"
  },
  "application/vnd.ms-excel": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "xls",
      "xlm",
      "xla",
      "xlc",
      "xlt",
      "xlw"
    ]
  },
  "application/vnd.ms-excel.addin.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "xlam"
    ]
  },
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "xlsb"
    ]
  },
  "application/vnd.ms-excel.sheet.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "xlsm"
    ]
  },
  "application/vnd.ms-excel.template.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "xltm"
    ]
  },
  "application/vnd.ms-fontobject": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "eot"
    ]
  },
  "application/vnd.ms-htmlhelp": {
    "source": "iana",
    "extensions": [
      "chm"
    ]
  },
  "application/vnd.ms-ims": {
    "source": "iana",
    "extensions": [
      "ims"
    ]
  },
  "application/vnd.ms-lrm": {
    "source": "iana",
    "extensions": [
      "lrm"
    ]
  },
  "application/vnd.ms-office.activex+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ms-officetheme": {
    "source": "iana",
    "extensions": [
      "thmx"
    ]
  },
  "application/vnd.ms-opentype": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.ms-outlook": {
    "compressible": false,
    "extensions": [
      "msg"
    ]
  },
  "application/vnd.ms-package.obfuscated-opentype": {
    "source": "apache"
  },
  "application/vnd.ms-pki.seccat": {
    "source": "apache",
    "extensions": [
      "cat"
    ]
  },
  "application/vnd.ms-pki.stl": {
    "source": "apache",
    "extensions": [
      "stl"
    ]
  },
  "application/vnd.ms-playready.initiator+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ms-powerpoint": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "ppt",
      "pps",
      "pot"
    ]
  },
  "application/vnd.ms-powerpoint.addin.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "ppam"
    ]
  },
  "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "pptm"
    ]
  },
  "application/vnd.ms-powerpoint.slide.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "sldm"
    ]
  },
  "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "ppsm"
    ]
  },
  "application/vnd.ms-powerpoint.template.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "potm"
    ]
  },
  "application/vnd.ms-printdevicecapabilities+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ms-printing.printticket+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.ms-printschematicket+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.ms-project": {
    "source": "iana",
    "extensions": [
      "mpp",
      "mpt"
    ]
  },
  "application/vnd.ms-tnef": {
    "source": "iana"
  },
  "application/vnd.ms-windows.devicepairing": {
    "source": "iana"
  },
  "application/vnd.ms-windows.nwprinting.oob": {
    "source": "iana"
  },
  "application/vnd.ms-windows.printerpairing": {
    "source": "iana"
  },
  "application/vnd.ms-windows.wsd.oob": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.lic-chlg-req": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.lic-resp": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.meter-chlg-req": {
    "source": "iana"
  },
  "application/vnd.ms-wmdrm.meter-resp": {
    "source": "iana"
  },
  "application/vnd.ms-word.document.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "docm"
    ]
  },
  "application/vnd.ms-word.template.macroenabled.12": {
    "source": "iana",
    "extensions": [
      "dotm"
    ]
  },
  "application/vnd.ms-works": {
    "source": "iana",
    "extensions": [
      "wps",
      "wks",
      "wcm",
      "wdb"
    ]
  },
  "application/vnd.ms-wpl": {
    "source": "iana",
    "extensions": [
      "wpl"
    ]
  },
  "application/vnd.ms-xpsdocument": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "xps"
    ]
  },
  "application/vnd.msa-disk-image": {
    "source": "iana"
  },
  "application/vnd.mseq": {
    "source": "iana",
    "extensions": [
      "mseq"
    ]
  },
  "application/vnd.msgpack": {
    "source": "iana"
  },
  "application/vnd.msign": {
    "source": "iana"
  },
  "application/vnd.multiad.creator": {
    "source": "iana"
  },
  "application/vnd.multiad.creator.cif": {
    "source": "iana"
  },
  "application/vnd.music-niff": {
    "source": "iana"
  },
  "application/vnd.musician": {
    "source": "iana",
    "extensions": [
      "mus"
    ]
  },
  "application/vnd.muvee.style": {
    "source": "iana",
    "extensions": [
      "msty"
    ]
  },
  "application/vnd.mynfc": {
    "source": "iana",
    "extensions": [
      "taglet"
    ]
  },
  "application/vnd.nacamar.ybrid+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nato.bindingdataobject+cbor": {
    "source": "iana"
  },
  "application/vnd.nato.bindingdataobject+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nato.bindingdataobject+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "bdo"
    ]
  },
  "application/vnd.nato.openxmlformats-package.iepd+zip": {
    "source": "iana",
    "compressible": false
  },
  "application/vnd.ncd.control": {
    "source": "iana"
  },
  "application/vnd.ncd.reference": {
    "source": "iana"
  },
  "application/vnd.nearst.inv+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nebumind.line": {
    "source": "iana"
  },
  "application/vnd.nervana": {
    "source": "iana"
  },
  "application/vnd.netfpx": {
    "source": "iana"
  },
  "application/vnd.neurolanguage.nlu": {
    "source": "iana",
    "extensions": [
      "nlu"
    ]
  },
  "application/vnd.nimn": {
    "source": "iana"
  },
  "application/vnd.nintendo.nitro.rom": {
    "source": "iana"
  },
  "application/vnd.nintendo.snes.rom": {
    "source": "iana"
  },
  "application/vnd.nitf": {
    "source": "iana",
    "extensions": [
      "ntf",
      "nitf"
    ]
  },
  "application/vnd.noblenet-directory": {
    "source": "iana",
    "extensions": [
      "nnd"
    ]
  },
  "application/vnd.noblenet-sealer": {
    "source": "iana",
    "extensions": [
      "nns"
    ]
  },
  "application/vnd.noblenet-web": {
    "source": "iana",
    "extensions": [
      "nnw"
    ]
  },
  "application/vnd.nokia.catalogs": {
    "source": "iana"
  },
  "application/vnd.nokia.conml+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.conml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nokia.iptv.config+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nokia.isds-radio-presets": {
    "source": "iana"
  },
  "application/vnd.nokia.landmark+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.landmark+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nokia.landmarkcollection+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nokia.n-gage.ac+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ac"
    ]
  },
  "application/vnd.nokia.n-gage.data": {
    "source": "iana",
    "extensions": [
      "ngdat"
    ]
  },
  "application/vnd.nokia.n-gage.symbian.install": {
    "source": "apache",
    "extensions": [
      "n-gage"
    ]
  },
  "application/vnd.nokia.ncd": {
    "source": "iana"
  },
  "application/vnd.nokia.pcd+wbxml": {
    "source": "iana"
  },
  "application/vnd.nokia.pcd+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.nokia.radio-preset": {
    "source": "iana",
    "extensions": [
      "rpst"
    ]
  },
  "application/vnd.nokia.radio-presets": {
    "source": "iana",
    "extensions": [
      "rpss"
    ]
  },
  "application/vnd.novadigm.edm": {
    "source": "iana",
    "extensions": [
      "edm"
    ]
  },
  "application/vnd.novadigm.edx": {
    "source": "iana",
    "extensions": [
      "edx"
    ]
  },
  "application/vnd.novadigm.ext": {
    "source": "iana",
    "extensions": [
      "ext"
    ]
  },
  "application/vnd.ntt-local.content-share": {
    "source": "iana"
  },
  "application/vnd.ntt-local.file-transfer": {
    "source": "iana"
  },
  "application/vnd.ntt-local.ogw_remote-access": {
    "source": "iana"
  },
  "application/vnd.ntt-local.sip-ta_remote": {
    "source": "iana"
  },
  "application/vnd.ntt-local.sip-ta_tcp_stream": {
    "source": "iana"
  },
  "application/vnd.oai.workflows": {
    "source": "iana"
  },
  "application/vnd.oai.workflows+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oai.workflows+yaml": {
    "source": "iana"
  },
  "application/vnd.oasis.opendocument.base": {
    "source": "iana"
  },
  "application/vnd.oasis.opendocument.chart": {
    "source": "iana",
    "extensions": [
      "odc"
    ]
  },
  "application/vnd.oasis.opendocument.chart-template": {
    "source": "iana",
    "extensions": [
      "otc"
    ]
  },
  "application/vnd.oasis.opendocument.database": {
    "source": "apache",
    "extensions": [
      "odb"
    ]
  },
  "application/vnd.oasis.opendocument.formula": {
    "source": "iana",
    "extensions": [
      "odf"
    ]
  },
  "application/vnd.oasis.opendocument.formula-template": {
    "source": "iana",
    "extensions": [
      "odft"
    ]
  },
  "application/vnd.oasis.opendocument.graphics": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "odg"
    ]
  },
  "application/vnd.oasis.opendocument.graphics-template": {
    "source": "iana",
    "extensions": [
      "otg"
    ]
  },
  "application/vnd.oasis.opendocument.image": {
    "source": "iana",
    "extensions": [
      "odi"
    ]
  },
  "application/vnd.oasis.opendocument.image-template": {
    "source": "iana",
    "extensions": [
      "oti"
    ]
  },
  "application/vnd.oasis.opendocument.presentation": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "odp"
    ]
  },
  "application/vnd.oasis.opendocument.presentation-template": {
    "source": "iana",
    "extensions": [
      "otp"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "ods"
    ]
  },
  "application/vnd.oasis.opendocument.spreadsheet-template": {
    "source": "iana",
    "extensions": [
      "ots"
    ]
  },
  "application/vnd.oasis.opendocument.text": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "odt"
    ]
  },
  "application/vnd.oasis.opendocument.text-master": {
    "source": "iana",
    "extensions": [
      "odm"
    ]
  },
  "application/vnd.oasis.opendocument.text-master-template": {
    "source": "iana"
  },
  "application/vnd.oasis.opendocument.text-template": {
    "source": "iana",
    "extensions": [
      "ott"
    ]
  },
  "application/vnd.oasis.opendocument.text-web": {
    "source": "iana",
    "extensions": [
      "oth"
    ]
  },
  "application/vnd.obn": {
    "source": "iana"
  },
  "application/vnd.ocf+cbor": {
    "source": "iana"
  },
  "application/vnd.oci.image.manifest.v1+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oftn.l10n+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.contentaccessdownload+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.contentaccessstreaming+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.cspg-hexbinary": {
    "source": "iana"
  },
  "application/vnd.oipf.dae.svg+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.dae.xhtml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.mippvcontrolmessage+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.pae.gem": {
    "source": "iana"
  },
  "application/vnd.oipf.spdiscovery+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.spdlist+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.ueprofile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oipf.userprofile+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.olpc-sugar": {
    "source": "iana",
    "extensions": [
      "xo"
    ]
  },
  "application/vnd.oma-scws-config": {
    "source": "iana"
  },
  "application/vnd.oma-scws-http-request": {
    "source": "iana"
  },
  "application/vnd.oma-scws-http-response": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.bcast.drm-trigger+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.oma.bcast.imd+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.bcast.ltkm": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.notification+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.bcast.provisioningtrigger": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sgboot": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.sgdd+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.bcast.sgdu": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.simple-symbol-container": {
    "source": "iana"
  },
  "application/vnd.oma.bcast.smartcard-trigger+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/vnd.oma.bcast.sprov+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.bcast.stkm": {
    "source": "iana"
  },
  "application/vnd.oma.cab-address-book+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.cab-feature-handler+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.cab-pcc+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.cab-subs-invite+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.cab-user-prefs+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.dcd": {
    "source": "iana"
  },
  "application/vnd.oma.dcdc": {
    "source": "iana"
  },
  "application/vnd.oma.dd2+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "dd2"
    ]
  },
  "application/vnd.oma.drm.risd+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.group-usage-list+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.lwm2m+cbor": {
    "source": "iana"
  },
  "application/vnd.oma.lwm2m+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.lwm2m+tlv": {
    "source": "iana"
  },
  "application/vnd.oma.pal+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.poc.detailed-progress-report+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.poc.final-report+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.poc.groups+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.poc.invocation-descriptor+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.poc.optimized-progress-report+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.push": {
    "source": "iana"
  },
  "application/vnd.oma.scidm.messages+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oma.xcap-directory+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.omads-email+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/vnd.omads-file+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/vnd.omads-folder+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/vnd.omaloc-supl-init": {
    "source": "iana"
  },
  "application/vnd.onepager": {
    "source": "iana"
  },
  "application/vnd.onepagertamp": {
    "source": "iana"
  },
  "application/vnd.onepagertamx": {
    "source": "iana"
  },
  "application/vnd.onepagertat": {
    "source": "iana"
  },
  "application/vnd.onepagertatp": {
    "source": "iana"
  },
  "application/vnd.onepagertatx": {
    "source": "iana"
  },
  "application/vnd.onvif.metadata": {
    "source": "iana"
  },
  "application/vnd.openblox.game+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "obgx"
    ]
  },
  "application/vnd.openblox.game-binary": {
    "source": "iana"
  },
  "application/vnd.openeye.oeb": {
    "source": "iana"
  },
  "application/vnd.openofficeorg.extension": {
    "source": "apache",
    "extensions": [
      "oxt"
    ]
  },
  "application/vnd.openstreetmap.data+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "osm"
    ]
  },
  "application/vnd.opentimestamps.ots": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawing+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "pptx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide": {
    "source": "iana",
    "extensions": [
      "sldx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
    "source": "iana",
    "extensions": [
      "ppsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template": {
    "source": "iana",
    "extensions": [
      "potx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "xlsx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
    "source": "iana",
    "extensions": [
      "xltx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.theme+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.vmldrawing": {
    "source": "iana"
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "docx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
    "source": "iana",
    "extensions": [
      "dotx"
    ]
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-package.core-properties+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.openxmlformats-package.relationships+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oracle.resource+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.orange.indata": {
    "source": "iana"
  },
  "application/vnd.osa.netdeploy": {
    "source": "iana"
  },
  "application/vnd.osgeo.mapguide.package": {
    "source": "iana",
    "extensions": [
      "mgp"
    ]
  },
  "application/vnd.osgi.bundle": {
    "source": "iana"
  },
  "application/vnd.osgi.dp": {
    "source": "iana",
    "extensions": [
      "dp"
    ]
  },
  "application/vnd.osgi.subsystem": {
    "source": "iana",
    "extensions": [
      "esa"
    ]
  },
  "application/vnd.otps.ct-kip+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.oxli.countgraph": {
    "source": "iana"
  },
  "application/vnd.pagerduty+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.palm": {
    "source": "iana",
    "extensions": [
      "pdb",
      "pqa",
      "oprc"
    ]
  },
  "application/vnd.panoply": {
    "source": "iana"
  },
  "application/vnd.paos.xml": {
    "source": "iana"
  },
  "application/vnd.patentdive": {
    "source": "iana"
  },
  "application/vnd.patientecommsdoc": {
    "source": "iana"
  },
  "application/vnd.pawaafile": {
    "source": "iana",
    "extensions": [
      "paw"
    ]
  },
  "application/vnd.pcos": {
    "source": "iana"
  },
  "application/vnd.pg.format": {
    "source": "iana",
    "extensions": [
      "str"
    ]
  },
  "application/vnd.pg.osasli": {
    "source": "iana",
    "extensions": [
      "ei6"
    ]
  },
  "application/vnd.piaccess.application-licence": {
    "source": "iana"
  },
  "application/vnd.picsel": {
    "source": "iana",
    "extensions": [
      "efif"
    ]
  },
  "application/vnd.pmi.widget": {
    "source": "iana",
    "extensions": [
      "wg"
    ]
  },
  "application/vnd.poc.group-advertisement+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.pocketlearn": {
    "source": "iana",
    "extensions": [
      "plf"
    ]
  },
  "application/vnd.powerbuilder6": {
    "source": "iana",
    "extensions": [
      "pbd"
    ]
  },
  "application/vnd.powerbuilder6-s": {
    "source": "iana"
  },
  "application/vnd.powerbuilder7": {
    "source": "iana"
  },
  "application/vnd.powerbuilder7-s": {
    "source": "iana"
  },
  "application/vnd.powerbuilder75": {
    "source": "iana"
  },
  "application/vnd.powerbuilder75-s": {
    "source": "iana"
  },
  "application/vnd.preminet": {
    "source": "iana"
  },
  "application/vnd.previewsystems.box": {
    "source": "iana",
    "extensions": [
      "box"
    ]
  },
  "application/vnd.proteus.magazine": {
    "source": "iana",
    "extensions": [
      "mgz"
    ]
  },
  "application/vnd.psfs": {
    "source": "iana"
  },
  "application/vnd.pt.mundusmundi": {
    "source": "iana"
  },
  "application/vnd.publishare-delta-tree": {
    "source": "iana",
    "extensions": [
      "qps"
    ]
  },
  "application/vnd.pvi.ptid1": {
    "source": "iana",
    "extensions": [
      "ptid"
    ]
  },
  "application/vnd.pwg-multiplexed": {
    "source": "iana"
  },
  "application/vnd.pwg-xhtml-print+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xhtm"
    ]
  },
  "application/vnd.qualcomm.brew-app-res": {
    "source": "iana"
  },
  "application/vnd.quarantainenet": {
    "source": "iana"
  },
  "application/vnd.quark.quarkxpress": {
    "source": "iana",
    "extensions": [
      "qxd",
      "qxt",
      "qwd",
      "qwt",
      "qxl",
      "qxb"
    ]
  },
  "application/vnd.quobject-quoxdocument": {
    "source": "iana"
  },
  "application/vnd.radisys.moml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-audit+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-audit-conf+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-audit-conn+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-audit-dialog+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-audit-stream+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-conf+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-base+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-fax-detect+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-group+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-speech+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.radisys.msml-dialog-transform+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.rainstor.data": {
    "source": "iana"
  },
  "application/vnd.rapid": {
    "source": "iana"
  },
  "application/vnd.rar": {
    "source": "iana",
    "extensions": [
      "rar"
    ]
  },
  "application/vnd.realvnc.bed": {
    "source": "iana",
    "extensions": [
      "bed"
    ]
  },
  "application/vnd.recordare.musicxml": {
    "source": "iana",
    "extensions": [
      "mxl"
    ]
  },
  "application/vnd.recordare.musicxml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "musicxml"
    ]
  },
  "application/vnd.relpipe": {
    "source": "iana"
  },
  "application/vnd.renlearn.rlprint": {
    "source": "iana"
  },
  "application/vnd.resilient.logic": {
    "source": "iana"
  },
  "application/vnd.restful+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.rig.cryptonote": {
    "source": "iana",
    "extensions": [
      "cryptonote"
    ]
  },
  "application/vnd.rim.cod": {
    "source": "apache",
    "extensions": [
      "cod"
    ]
  },
  "application/vnd.rn-realmedia": {
    "source": "apache",
    "extensions": [
      "rm"
    ]
  },
  "application/vnd.rn-realmedia-vbr": {
    "source": "apache",
    "extensions": [
      "rmvb"
    ]
  },
  "application/vnd.route66.link66+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "link66"
    ]
  },
  "application/vnd.rs-274x": {
    "source": "iana"
  },
  "application/vnd.ruckus.download": {
    "source": "iana"
  },
  "application/vnd.s3sms": {
    "source": "iana"
  },
  "application/vnd.sailingtracker.track": {
    "source": "iana",
    "extensions": [
      "st"
    ]
  },
  "application/vnd.sar": {
    "source": "iana"
  },
  "application/vnd.sbm.cid": {
    "source": "iana"
  },
  "application/vnd.sbm.mid2": {
    "source": "iana"
  },
  "application/vnd.scribus": {
    "source": "iana"
  },
  "application/vnd.sealed.3df": {
    "source": "iana"
  },
  "application/vnd.sealed.csf": {
    "source": "iana"
  },
  "application/vnd.sealed.doc": {
    "source": "iana"
  },
  "application/vnd.sealed.eml": {
    "source": "iana"
  },
  "application/vnd.sealed.mht": {
    "source": "iana"
  },
  "application/vnd.sealed.net": {
    "source": "iana"
  },
  "application/vnd.sealed.ppt": {
    "source": "iana"
  },
  "application/vnd.sealed.tiff": {
    "source": "iana"
  },
  "application/vnd.sealed.xls": {
    "source": "iana"
  },
  "application/vnd.sealedmedia.softseal.html": {
    "source": "iana"
  },
  "application/vnd.sealedmedia.softseal.pdf": {
    "source": "iana"
  },
  "application/vnd.seemail": {
    "source": "iana",
    "extensions": [
      "see"
    ]
  },
  "application/vnd.seis+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.sema": {
    "source": "iana",
    "extensions": [
      "sema"
    ]
  },
  "application/vnd.semd": {
    "source": "iana",
    "extensions": [
      "semd"
    ]
  },
  "application/vnd.semf": {
    "source": "iana",
    "extensions": [
      "semf"
    ]
  },
  "application/vnd.shade-save-file": {
    "source": "iana"
  },
  "application/vnd.shana.informed.formdata": {
    "source": "iana",
    "extensions": [
      "ifm"
    ]
  },
  "application/vnd.shana.informed.formtemplate": {
    "source": "iana",
    "extensions": [
      "itp"
    ]
  },
  "application/vnd.shana.informed.interchange": {
    "source": "iana",
    "extensions": [
      "iif"
    ]
  },
  "application/vnd.shana.informed.package": {
    "source": "iana",
    "extensions": [
      "ipk"
    ]
  },
  "application/vnd.shootproof+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.shopkick+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.shp": {
    "source": "iana"
  },
  "application/vnd.shx": {
    "source": "iana"
  },
  "application/vnd.sigrok.session": {
    "source": "iana"
  },
  "application/vnd.simtech-mindmapper": {
    "source": "iana",
    "extensions": [
      "twd",
      "twds"
    ]
  },
  "application/vnd.siren+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.smaf": {
    "source": "iana",
    "extensions": [
      "mmf"
    ]
  },
  "application/vnd.smart.notebook": {
    "source": "iana"
  },
  "application/vnd.smart.teacher": {
    "source": "iana",
    "extensions": [
      "teacher"
    ]
  },
  "application/vnd.smintio.portals.archive": {
    "source": "iana"
  },
  "application/vnd.snesdev-page-table": {
    "source": "iana"
  },
  "application/vnd.software602.filler.form+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "fo"
    ]
  },
  "application/vnd.software602.filler.form-xml-zip": {
    "source": "iana"
  },
  "application/vnd.solent.sdkm+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "sdkm",
      "sdkd"
    ]
  },
  "application/vnd.spotfire.dxp": {
    "source": "iana",
    "extensions": [
      "dxp"
    ]
  },
  "application/vnd.spotfire.sfs": {
    "source": "iana",
    "extensions": [
      "sfs"
    ]
  },
  "application/vnd.sqlite3": {
    "source": "iana"
  },
  "application/vnd.sss-cod": {
    "source": "iana"
  },
  "application/vnd.sss-dtf": {
    "source": "iana"
  },
  "application/vnd.sss-ntf": {
    "source": "iana"
  },
  "application/vnd.stardivision.calc": {
    "source": "apache",
    "extensions": [
      "sdc"
    ]
  },
  "application/vnd.stardivision.draw": {
    "source": "apache",
    "extensions": [
      "sda"
    ]
  },
  "application/vnd.stardivision.impress": {
    "source": "apache",
    "extensions": [
      "sdd"
    ]
  },
  "application/vnd.stardivision.math": {
    "source": "apache",
    "extensions": [
      "smf"
    ]
  },
  "application/vnd.stardivision.writer": {
    "source": "apache",
    "extensions": [
      "sdw",
      "vor"
    ]
  },
  "application/vnd.stardivision.writer-global": {
    "source": "apache",
    "extensions": [
      "sgl"
    ]
  },
  "application/vnd.stepmania.package": {
    "source": "iana",
    "extensions": [
      "smzip"
    ]
  },
  "application/vnd.stepmania.stepchart": {
    "source": "iana",
    "extensions": [
      "sm"
    ]
  },
  "application/vnd.street-stream": {
    "source": "iana"
  },
  "application/vnd.sun.wadl+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wadl"
    ]
  },
  "application/vnd.sun.xml.calc": {
    "source": "apache",
    "extensions": [
      "sxc"
    ]
  },
  "application/vnd.sun.xml.calc.template": {
    "source": "apache",
    "extensions": [
      "stc"
    ]
  },
  "application/vnd.sun.xml.draw": {
    "source": "apache",
    "extensions": [
      "sxd"
    ]
  },
  "application/vnd.sun.xml.draw.template": {
    "source": "apache",
    "extensions": [
      "std"
    ]
  },
  "application/vnd.sun.xml.impress": {
    "source": "apache",
    "extensions": [
      "sxi"
    ]
  },
  "application/vnd.sun.xml.impress.template": {
    "source": "apache",
    "extensions": [
      "sti"
    ]
  },
  "application/vnd.sun.xml.math": {
    "source": "apache",
    "extensions": [
      "sxm"
    ]
  },
  "application/vnd.sun.xml.writer": {
    "source": "apache",
    "extensions": [
      "sxw"
    ]
  },
  "application/vnd.sun.xml.writer.global": {
    "source": "apache",
    "extensions": [
      "sxg"
    ]
  },
  "application/vnd.sun.xml.writer.template": {
    "source": "apache",
    "extensions": [
      "stw"
    ]
  },
  "application/vnd.sus-calendar": {
    "source": "iana",
    "extensions": [
      "sus",
      "susp"
    ]
  },
  "application/vnd.svd": {
    "source": "iana",
    "extensions": [
      "svd"
    ]
  },
  "application/vnd.swiftview-ics": {
    "source": "iana"
  },
  "application/vnd.sybyl.mol2": {
    "source": "iana"
  },
  "application/vnd.sycle+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.syft+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.symbian.install": {
    "source": "apache",
    "extensions": [
      "sis",
      "sisx"
    ]
  },
  "application/vnd.syncml+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "xsm"
    ]
  },
  "application/vnd.syncml.dm+wbxml": {
    "source": "iana",
    "charset": "UTF-8",
    "extensions": [
      "bdm"
    ]
  },
  "application/vnd.syncml.dm+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "xdm"
    ]
  },
  "application/vnd.syncml.dm.notification": {
    "source": "iana"
  },
  "application/vnd.syncml.dmddf+wbxml": {
    "source": "iana"
  },
  "application/vnd.syncml.dmddf+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "ddf"
    ]
  },
  "application/vnd.syncml.dmtnds+wbxml": {
    "source": "iana"
  },
  "application/vnd.syncml.dmtnds+xml": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true
  },
  "application/vnd.syncml.ds.notification": {
    "source": "iana"
  },
  "application/vnd.tableschema+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.tao.intent-module-archive": {
    "source": "iana",
    "extensions": [
      "tao"
    ]
  },
  "application/vnd.tcpdump.pcap": {
    "source": "iana",
    "extensions": [
      "pcap",
      "cap",
      "dmp"
    ]
  },
  "application/vnd.think-cell.ppttc+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.tmd.mediaflex.api+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.tml": {
    "source": "iana"
  },
  "application/vnd.tmobile-livetv": {
    "source": "iana",
    "extensions": [
      "tmo"
    ]
  },
  "application/vnd.tri.onesource": {
    "source": "iana"
  },
  "application/vnd.trid.tpt": {
    "source": "iana",
    "extensions": [
      "tpt"
    ]
  },
  "application/vnd.triscape.mxs": {
    "source": "iana",
    "extensions": [
      "mxs"
    ]
  },
  "application/vnd.trueapp": {
    "source": "iana",
    "extensions": [
      "tra"
    ]
  },
  "application/vnd.truedoc": {
    "source": "iana"
  },
  "application/vnd.ubisoft.webplayer": {
    "source": "iana"
  },
  "application/vnd.ufdl": {
    "source": "iana",
    "extensions": [
      "ufd",
      "ufdl"
    ]
  },
  "application/vnd.uiq.theme": {
    "source": "iana",
    "extensions": [
      "utz"
    ]
  },
  "application/vnd.umajin": {
    "source": "iana",
    "extensions": [
      "umj"
    ]
  },
  "application/vnd.unity": {
    "source": "iana",
    "extensions": [
      "unityweb"
    ]
  },
  "application/vnd.uoml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "uoml",
      "uo"
    ]
  },
  "application/vnd.uplanet.alert": {
    "source": "iana"
  },
  "application/vnd.uplanet.alert-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.bearer-choice": {
    "source": "iana"
  },
  "application/vnd.uplanet.bearer-choice-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.cacheop": {
    "source": "iana"
  },
  "application/vnd.uplanet.cacheop-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.channel": {
    "source": "iana"
  },
  "application/vnd.uplanet.channel-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.list": {
    "source": "iana"
  },
  "application/vnd.uplanet.list-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.listcmd": {
    "source": "iana"
  },
  "application/vnd.uplanet.listcmd-wbxml": {
    "source": "iana"
  },
  "application/vnd.uplanet.signal": {
    "source": "iana"
  },
  "application/vnd.uri-map": {
    "source": "iana"
  },
  "application/vnd.valve.source.material": {
    "source": "iana"
  },
  "application/vnd.vcx": {
    "source": "iana",
    "extensions": [
      "vcx"
    ]
  },
  "application/vnd.vd-study": {
    "source": "iana"
  },
  "application/vnd.vectorworks": {
    "source": "iana"
  },
  "application/vnd.vel+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.verimatrix.vcas": {
    "source": "iana"
  },
  "application/vnd.veritone.aion+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.veryant.thin": {
    "source": "iana"
  },
  "application/vnd.ves.encrypted": {
    "source": "iana"
  },
  "application/vnd.vidsoft.vidconference": {
    "source": "iana"
  },
  "application/vnd.visio": {
    "source": "iana",
    "extensions": [
      "vsd",
      "vst",
      "vss",
      "vsw"
    ]
  },
  "application/vnd.visionary": {
    "source": "iana",
    "extensions": [
      "vis"
    ]
  },
  "application/vnd.vividence.scriptfile": {
    "source": "iana"
  },
  "application/vnd.vsf": {
    "source": "iana",
    "extensions": [
      "vsf"
    ]
  },
  "application/vnd.wap.sic": {
    "source": "iana"
  },
  "application/vnd.wap.slc": {
    "source": "iana"
  },
  "application/vnd.wap.wbxml": {
    "source": "iana",
    "charset": "UTF-8",
    "extensions": [
      "wbxml"
    ]
  },
  "application/vnd.wap.wmlc": {
    "source": "iana",
    "extensions": [
      "wmlc"
    ]
  },
  "application/vnd.wap.wmlscriptc": {
    "source": "iana",
    "extensions": [
      "wmlsc"
    ]
  },
  "application/vnd.wasmflow.wafl": {
    "source": "iana"
  },
  "application/vnd.webturbo": {
    "source": "iana",
    "extensions": [
      "wtb"
    ]
  },
  "application/vnd.wfa.dpp": {
    "source": "iana"
  },
  "application/vnd.wfa.p2p": {
    "source": "iana"
  },
  "application/vnd.wfa.wsc": {
    "source": "iana"
  },
  "application/vnd.windows.devicepairing": {
    "source": "iana"
  },
  "application/vnd.wmc": {
    "source": "iana"
  },
  "application/vnd.wmf.bootstrap": {
    "source": "iana"
  },
  "application/vnd.wolfram.mathematica": {
    "source": "iana"
  },
  "application/vnd.wolfram.mathematica.package": {
    "source": "iana"
  },
  "application/vnd.wolfram.player": {
    "source": "iana",
    "extensions": [
      "nbp"
    ]
  },
  "application/vnd.wordlift": {
    "source": "iana"
  },
  "application/vnd.wordperfect": {
    "source": "iana",
    "extensions": [
      "wpd"
    ]
  },
  "application/vnd.wqd": {
    "source": "iana",
    "extensions": [
      "wqd"
    ]
  },
  "application/vnd.wrq-hp3000-labelled": {
    "source": "iana"
  },
  "application/vnd.wt.stf": {
    "source": "iana",
    "extensions": [
      "stf"
    ]
  },
  "application/vnd.wv.csp+wbxml": {
    "source": "iana"
  },
  "application/vnd.wv.csp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.wv.ssp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.xacml+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.xara": {
    "source": "iana",
    "extensions": [
      "xar"
    ]
  },
  "application/vnd.xecrets-encrypted": {
    "source": "iana"
  },
  "application/vnd.xfdl": {
    "source": "iana",
    "extensions": [
      "xfdl"
    ]
  },
  "application/vnd.xfdl.webform": {
    "source": "iana"
  },
  "application/vnd.xmi+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/vnd.xmpie.cpkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.dpkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.plan": {
    "source": "iana"
  },
  "application/vnd.xmpie.ppkg": {
    "source": "iana"
  },
  "application/vnd.xmpie.xlim": {
    "source": "iana"
  },
  "application/vnd.yamaha.hv-dic": {
    "source": "iana",
    "extensions": [
      "hvd"
    ]
  },
  "application/vnd.yamaha.hv-script": {
    "source": "iana",
    "extensions": [
      "hvs"
    ]
  },
  "application/vnd.yamaha.hv-voice": {
    "source": "iana",
    "extensions": [
      "hvp"
    ]
  },
  "application/vnd.yamaha.openscoreformat": {
    "source": "iana",
    "extensions": [
      "osf"
    ]
  },
  "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "osfpvg"
    ]
  },
  "application/vnd.yamaha.remote-setup": {
    "source": "iana"
  },
  "application/vnd.yamaha.smaf-audio": {
    "source": "iana",
    "extensions": [
      "saf"
    ]
  },
  "application/vnd.yamaha.smaf-phrase": {
    "source": "iana",
    "extensions": [
      "spf"
    ]
  },
  "application/vnd.yamaha.through-ngn": {
    "source": "iana"
  },
  "application/vnd.yamaha.tunnel-udpencap": {
    "source": "iana"
  },
  "application/vnd.yaoweme": {
    "source": "iana"
  },
  "application/vnd.yellowriver-custom-menu": {
    "source": "iana",
    "extensions": [
      "cmp"
    ]
  },
  "application/vnd.zul": {
    "source": "iana",
    "extensions": [
      "zir",
      "zirz"
    ]
  },
  "application/vnd.zzazz.deck+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "zaz"
    ]
  },
  "application/voicexml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "vxml"
    ]
  },
  "application/voucher-cms+json": {
    "source": "iana",
    "compressible": true
  },
  "application/vp": {
    "source": "iana"
  },
  "application/vq-rtcpxr": {
    "source": "iana"
  },
  "application/wasm": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wasm"
    ]
  },
  "application/watcherinfo+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wif"
    ]
  },
  "application/webpush-options+json": {
    "source": "iana",
    "compressible": true
  },
  "application/whoispp-query": {
    "source": "iana"
  },
  "application/whoispp-response": {
    "source": "iana"
  },
  "application/widget": {
    "source": "iana",
    "extensions": [
      "wgt"
    ]
  },
  "application/winhlp": {
    "source": "apache",
    "extensions": [
      "hlp"
    ]
  },
  "application/wita": {
    "source": "iana"
  },
  "application/wordperfect5.1": {
    "source": "iana"
  },
  "application/wsdl+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wsdl"
    ]
  },
  "application/wspolicy+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "wspolicy"
    ]
  },
  "application/x-7z-compressed": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "7z"
    ]
  },
  "application/x-abiword": {
    "source": "apache",
    "extensions": [
      "abw"
    ]
  },
  "application/x-ace-compressed": {
    "source": "apache",
    "extensions": [
      "ace"
    ]
  },
  "application/x-amf": {
    "source": "apache"
  },
  "application/x-apple-diskimage": {
    "source": "apache",
    "extensions": [
      "dmg"
    ]
  },
  "application/x-arj": {
    "compressible": false,
    "extensions": [
      "arj"
    ]
  },
  "application/x-authorware-bin": {
    "source": "apache",
    "extensions": [
      "aab",
      "x32",
      "u32",
      "vox"
    ]
  },
  "application/x-authorware-map": {
    "source": "apache",
    "extensions": [
      "aam"
    ]
  },
  "application/x-authorware-seg": {
    "source": "apache",
    "extensions": [
      "aas"
    ]
  },
  "application/x-bcpio": {
    "source": "apache",
    "extensions": [
      "bcpio"
    ]
  },
  "application/x-bdoc": {
    "compressible": false,
    "extensions": [
      "bdoc"
    ]
  },
  "application/x-bittorrent": {
    "source": "apache",
    "extensions": [
      "torrent"
    ]
  },
  "application/x-blorb": {
    "source": "apache",
    "extensions": [
      "blb",
      "blorb"
    ]
  },
  "application/x-bzip": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "bz"
    ]
  },
  "application/x-bzip2": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "bz2",
      "boz"
    ]
  },
  "application/x-cbr": {
    "source": "apache",
    "extensions": [
      "cbr",
      "cba",
      "cbt",
      "cbz",
      "cb7"
    ]
  },
  "application/x-cdlink": {
    "source": "apache",
    "extensions": [
      "vcd"
    ]
  },
  "application/x-cfs-compressed": {
    "source": "apache",
    "extensions": [
      "cfs"
    ]
  },
  "application/x-chat": {
    "source": "apache",
    "extensions": [
      "chat"
    ]
  },
  "application/x-chess-pgn": {
    "source": "apache",
    "extensions": [
      "pgn"
    ]
  },
  "application/x-chrome-extension": {
    "extensions": [
      "crx"
    ]
  },
  "application/x-cocoa": {
    "source": "nginx",
    "extensions": [
      "cco"
    ]
  },
  "application/x-compress": {
    "source": "apache"
  },
  "application/x-conference": {
    "source": "apache",
    "extensions": [
      "nsc"
    ]
  },
  "application/x-cpio": {
    "source": "apache",
    "extensions": [
      "cpio"
    ]
  },
  "application/x-csh": {
    "source": "apache",
    "extensions": [
      "csh"
    ]
  },
  "application/x-deb": {
    "compressible": false
  },
  "application/x-debian-package": {
    "source": "apache",
    "extensions": [
      "deb",
      "udeb"
    ]
  },
  "application/x-dgc-compressed": {
    "source": "apache",
    "extensions": [
      "dgc"
    ]
  },
  "application/x-director": {
    "source": "apache",
    "extensions": [
      "dir",
      "dcr",
      "dxr",
      "cst",
      "cct",
      "cxt",
      "w3d",
      "fgd",
      "swa"
    ]
  },
  "application/x-doom": {
    "source": "apache",
    "extensions": [
      "wad"
    ]
  },
  "application/x-dtbncx+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "ncx"
    ]
  },
  "application/x-dtbook+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "dtb"
    ]
  },
  "application/x-dtbresource+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "res"
    ]
  },
  "application/x-dvi": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "dvi"
    ]
  },
  "application/x-envoy": {
    "source": "apache",
    "extensions": [
      "evy"
    ]
  },
  "application/x-eva": {
    "source": "apache",
    "extensions": [
      "eva"
    ]
  },
  "application/x-font-bdf": {
    "source": "apache",
    "extensions": [
      "bdf"
    ]
  },
  "application/x-font-dos": {
    "source": "apache"
  },
  "application/x-font-framemaker": {
    "source": "apache"
  },
  "application/x-font-ghostscript": {
    "source": "apache",
    "extensions": [
      "gsf"
    ]
  },
  "application/x-font-libgrx": {
    "source": "apache"
  },
  "application/x-font-linux-psf": {
    "source": "apache",
    "extensions": [
      "psf"
    ]
  },
  "application/x-font-pcf": {
    "source": "apache",
    "extensions": [
      "pcf"
    ]
  },
  "application/x-font-snf": {
    "source": "apache",
    "extensions": [
      "snf"
    ]
  },
  "application/x-font-speedo": {
    "source": "apache"
  },
  "application/x-font-sunos-news": {
    "source": "apache"
  },
  "application/x-font-type1": {
    "source": "apache",
    "extensions": [
      "pfa",
      "pfb",
      "pfm",
      "afm"
    ]
  },
  "application/x-font-vfont": {
    "source": "apache"
  },
  "application/x-freearc": {
    "source": "apache",
    "extensions": [
      "arc"
    ]
  },
  "application/x-futuresplash": {
    "source": "apache",
    "extensions": [
      "spl"
    ]
  },
  "application/x-gca-compressed": {
    "source": "apache",
    "extensions": [
      "gca"
    ]
  },
  "application/x-glulx": {
    "source": "apache",
    "extensions": [
      "ulx"
    ]
  },
  "application/x-gnumeric": {
    "source": "apache",
    "extensions": [
      "gnumeric"
    ]
  },
  "application/x-gramps-xml": {
    "source": "apache",
    "extensions": [
      "gramps"
    ]
  },
  "application/x-gtar": {
    "source": "apache",
    "extensions": [
      "gtar"
    ]
  },
  "application/x-gzip": {
    "source": "apache"
  },
  "application/x-hdf": {
    "source": "apache",
    "extensions": [
      "hdf"
    ]
  },
  "application/x-httpd-php": {
    "compressible": true,
    "extensions": [
      "php"
    ]
  },
  "application/x-install-instructions": {
    "source": "apache",
    "extensions": [
      "install"
    ]
  },
  "application/x-iso9660-image": {
    "source": "apache",
    "extensions": [
      "iso"
    ]
  },
  "application/x-iwork-keynote-sffkey": {
    "extensions": [
      "key"
    ]
  },
  "application/x-iwork-numbers-sffnumbers": {
    "extensions": [
      "numbers"
    ]
  },
  "application/x-iwork-pages-sffpages": {
    "extensions": [
      "pages"
    ]
  },
  "application/x-java-archive-diff": {
    "source": "nginx",
    "extensions": [
      "jardiff"
    ]
  },
  "application/x-java-jnlp-file": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "jnlp"
    ]
  },
  "application/x-javascript": {
    "compressible": true
  },
  "application/x-keepass2": {
    "extensions": [
      "kdbx"
    ]
  },
  "application/x-latex": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "latex"
    ]
  },
  "application/x-lua-bytecode": {
    "extensions": [
      "luac"
    ]
  },
  "application/x-lzh-compressed": {
    "source": "apache",
    "extensions": [
      "lzh",
      "lha"
    ]
  },
  "application/x-makeself": {
    "source": "nginx",
    "extensions": [
      "run"
    ]
  },
  "application/x-mie": {
    "source": "apache",
    "extensions": [
      "mie"
    ]
  },
  "application/x-mobipocket-ebook": {
    "source": "apache",
    "extensions": [
      "prc",
      "mobi"
    ]
  },
  "application/x-mpegurl": {
    "compressible": false
  },
  "application/x-ms-application": {
    "source": "apache",
    "extensions": [
      "application"
    ]
  },
  "application/x-ms-shortcut": {
    "source": "apache",
    "extensions": [
      "lnk"
    ]
  },
  "application/x-ms-wmd": {
    "source": "apache",
    "extensions": [
      "wmd"
    ]
  },
  "application/x-ms-wmz": {
    "source": "apache",
    "extensions": [
      "wmz"
    ]
  },
  "application/x-ms-xbap": {
    "source": "apache",
    "extensions": [
      "xbap"
    ]
  },
  "application/x-msaccess": {
    "source": "apache",
    "extensions": [
      "mdb"
    ]
  },
  "application/x-msbinder": {
    "source": "apache",
    "extensions": [
      "obd"
    ]
  },
  "application/x-mscardfile": {
    "source": "apache",
    "extensions": [
      "crd"
    ]
  },
  "application/x-msclip": {
    "source": "apache",
    "extensions": [
      "clp"
    ]
  },
  "application/x-msdos-program": {
    "extensions": [
      "exe"
    ]
  },
  "application/x-msdownload": {
    "source": "apache",
    "extensions": [
      "exe",
      "dll",
      "com",
      "bat",
      "msi"
    ]
  },
  "application/x-msmediaview": {
    "source": "apache",
    "extensions": [
      "mvb",
      "m13",
      "m14"
    ]
  },
  "application/x-msmetafile": {
    "source": "apache",
    "extensions": [
      "wmf",
      "wmz",
      "emf",
      "emz"
    ]
  },
  "application/x-msmoney": {
    "source": "apache",
    "extensions": [
      "mny"
    ]
  },
  "application/x-mspublisher": {
    "source": "apache",
    "extensions": [
      "pub"
    ]
  },
  "application/x-msschedule": {
    "source": "apache",
    "extensions": [
      "scd"
    ]
  },
  "application/x-msterminal": {
    "source": "apache",
    "extensions": [
      "trm"
    ]
  },
  "application/x-mswrite": {
    "source": "apache",
    "extensions": [
      "wri"
    ]
  },
  "application/x-netcdf": {
    "source": "apache",
    "extensions": [
      "nc",
      "cdf"
    ]
  },
  "application/x-ns-proxy-autoconfig": {
    "compressible": true,
    "extensions": [
      "pac"
    ]
  },
  "application/x-nzb": {
    "source": "apache",
    "extensions": [
      "nzb"
    ]
  },
  "application/x-perl": {
    "source": "nginx",
    "extensions": [
      "pl",
      "pm"
    ]
  },
  "application/x-pilot": {
    "source": "nginx",
    "extensions": [
      "prc",
      "pdb"
    ]
  },
  "application/x-pkcs12": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "p12",
      "pfx"
    ]
  },
  "application/x-pkcs7-certificates": {
    "source": "apache",
    "extensions": [
      "p7b",
      "spc"
    ]
  },
  "application/x-pkcs7-certreqresp": {
    "source": "apache",
    "extensions": [
      "p7r"
    ]
  },
  "application/x-pki-message": {
    "source": "iana"
  },
  "application/x-rar-compressed": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "rar"
    ]
  },
  "application/x-redhat-package-manager": {
    "source": "nginx",
    "extensions": [
      "rpm"
    ]
  },
  "application/x-research-info-systems": {
    "source": "apache",
    "extensions": [
      "ris"
    ]
  },
  "application/x-sea": {
    "source": "nginx",
    "extensions": [
      "sea"
    ]
  },
  "application/x-sh": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "sh"
    ]
  },
  "application/x-shar": {
    "source": "apache",
    "extensions": [
      "shar"
    ]
  },
  "application/x-shockwave-flash": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "swf"
    ]
  },
  "application/x-silverlight-app": {
    "source": "apache",
    "extensions": [
      "xap"
    ]
  },
  "application/x-sql": {
    "source": "apache",
    "extensions": [
      "sql"
    ]
  },
  "application/x-stuffit": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "sit"
    ]
  },
  "application/x-stuffitx": {
    "source": "apache",
    "extensions": [
      "sitx"
    ]
  },
  "application/x-subrip": {
    "source": "apache",
    "extensions": [
      "srt"
    ]
  },
  "application/x-sv4cpio": {
    "source": "apache",
    "extensions": [
      "sv4cpio"
    ]
  },
  "application/x-sv4crc": {
    "source": "apache",
    "extensions": [
      "sv4crc"
    ]
  },
  "application/x-t3vm-image": {
    "source": "apache",
    "extensions": [
      "t3"
    ]
  },
  "application/x-tads": {
    "source": "apache",
    "extensions": [
      "gam"
    ]
  },
  "application/x-tar": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "tar"
    ]
  },
  "application/x-tcl": {
    "source": "apache",
    "extensions": [
      "tcl",
      "tk"
    ]
  },
  "application/x-tex": {
    "source": "apache",
    "extensions": [
      "tex"
    ]
  },
  "application/x-tex-tfm": {
    "source": "apache",
    "extensions": [
      "tfm"
    ]
  },
  "application/x-texinfo": {
    "source": "apache",
    "extensions": [
      "texinfo",
      "texi"
    ]
  },
  "application/x-tgif": {
    "source": "apache",
    "extensions": [
      "obj"
    ]
  },
  "application/x-ustar": {
    "source": "apache",
    "extensions": [
      "ustar"
    ]
  },
  "application/x-virtualbox-hdd": {
    "compressible": true,
    "extensions": [
      "hdd"
    ]
  },
  "application/x-virtualbox-ova": {
    "compressible": true,
    "extensions": [
      "ova"
    ]
  },
  "application/x-virtualbox-ovf": {
    "compressible": true,
    "extensions": [
      "ovf"
    ]
  },
  "application/x-virtualbox-vbox": {
    "compressible": true,
    "extensions": [
      "vbox"
    ]
  },
  "application/x-virtualbox-vbox-extpack": {
    "compressible": false,
    "extensions": [
      "vbox-extpack"
    ]
  },
  "application/x-virtualbox-vdi": {
    "compressible": true,
    "extensions": [
      "vdi"
    ]
  },
  "application/x-virtualbox-vhd": {
    "compressible": true,
    "extensions": [
      "vhd"
    ]
  },
  "application/x-virtualbox-vmdk": {
    "compressible": true,
    "extensions": [
      "vmdk"
    ]
  },
  "application/x-wais-source": {
    "source": "apache",
    "extensions": [
      "src"
    ]
  },
  "application/x-web-app-manifest+json": {
    "compressible": true,
    "extensions": [
      "webapp"
    ]
  },
  "application/x-www-form-urlencoded": {
    "source": "iana",
    "compressible": true
  },
  "application/x-x509-ca-cert": {
    "source": "iana",
    "extensions": [
      "der",
      "crt",
      "pem"
    ]
  },
  "application/x-x509-ca-ra-cert": {
    "source": "iana"
  },
  "application/x-x509-next-ca-cert": {
    "source": "iana"
  },
  "application/x-xfig": {
    "source": "apache",
    "extensions": [
      "fig"
    ]
  },
  "application/x-xliff+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "xlf"
    ]
  },
  "application/x-xpinstall": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "xpi"
    ]
  },
  "application/x-xz": {
    "source": "apache",
    "extensions": [
      "xz"
    ]
  },
  "application/x-zmachine": {
    "source": "apache",
    "extensions": [
      "z1",
      "z2",
      "z3",
      "z4",
      "z5",
      "z6",
      "z7",
      "z8"
    ]
  },
  "application/x400-bp": {
    "source": "iana"
  },
  "application/xacml+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xaml+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "xaml"
    ]
  },
  "application/xcap-att+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xav"
    ]
  },
  "application/xcap-caps+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xca"
    ]
  },
  "application/xcap-diff+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xdf"
    ]
  },
  "application/xcap-el+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xel"
    ]
  },
  "application/xcap-error+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xcap-ns+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xns"
    ]
  },
  "application/xcon-conference-info+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xcon-conference-info-diff+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xenc+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xenc"
    ]
  },
  "application/xfdf": {
    "source": "iana",
    "extensions": [
      "xfdf"
    ]
  },
  "application/xhtml+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xhtml",
      "xht"
    ]
  },
  "application/xhtml-voice+xml": {
    "source": "apache",
    "compressible": true
  },
  "application/xliff+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xlf"
    ]
  },
  "application/xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xml",
      "xsl",
      "xsd",
      "rng"
    ]
  },
  "application/xml-dtd": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "dtd"
    ]
  },
  "application/xml-external-parsed-entity": {
    "source": "iana"
  },
  "application/xml-patch+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xmpp+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/xop+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xop"
    ]
  },
  "application/xproc+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "xpl"
    ]
  },
  "application/xslt+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xsl",
      "xslt"
    ]
  },
  "application/xspf+xml": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "xspf"
    ]
  },
  "application/xv+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "mxml",
      "xhvml",
      "xvml",
      "xvm"
    ]
  },
  "application/yaml": {
    "source": "iana"
  },
  "application/yang": {
    "source": "iana",
    "extensions": [
      "yang"
    ]
  },
  "application/yang-data+cbor": {
    "source": "iana"
  },
  "application/yang-data+json": {
    "source": "iana",
    "compressible": true
  },
  "application/yang-data+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/yang-patch+json": {
    "source": "iana",
    "compressible": true
  },
  "application/yang-patch+xml": {
    "source": "iana",
    "compressible": true
  },
  "application/yang-sid+json": {
    "source": "iana",
    "compressible": true
  },
  "application/yin+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "yin"
    ]
  },
  "application/zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "zip"
    ]
  },
  "application/zlib": {
    "source": "iana"
  },
  "application/zstd": {
    "source": "iana"
  },
  "audio/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "audio/32kadpcm": {
    "source": "iana"
  },
  "audio/3gpp": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "3gpp"
    ]
  },
  "audio/3gpp2": {
    "source": "iana"
  },
  "audio/aac": {
    "source": "iana",
    "extensions": [
      "adts",
      "aac"
    ]
  },
  "audio/ac3": {
    "source": "iana"
  },
  "audio/adpcm": {
    "source": "apache",
    "extensions": [
      "adp"
    ]
  },
  "audio/amr": {
    "source": "iana",
    "extensions": [
      "amr"
    ]
  },
  "audio/amr-wb": {
    "source": "iana"
  },
  "audio/amr-wb+": {
    "source": "iana"
  },
  "audio/aptx": {
    "source": "iana"
  },
  "audio/asc": {
    "source": "iana"
  },
  "audio/atrac-advanced-lossless": {
    "source": "iana"
  },
  "audio/atrac-x": {
    "source": "iana"
  },
  "audio/atrac3": {
    "source": "iana"
  },
  "audio/basic": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "au",
      "snd"
    ]
  },
  "audio/bv16": {
    "source": "iana"
  },
  "audio/bv32": {
    "source": "iana"
  },
  "audio/clearmode": {
    "source": "iana"
  },
  "audio/cn": {
    "source": "iana"
  },
  "audio/dat12": {
    "source": "iana"
  },
  "audio/dls": {
    "source": "iana"
  },
  "audio/dsr-es201108": {
    "source": "iana"
  },
  "audio/dsr-es202050": {
    "source": "iana"
  },
  "audio/dsr-es202211": {
    "source": "iana"
  },
  "audio/dsr-es202212": {
    "source": "iana"
  },
  "audio/dv": {
    "source": "iana"
  },
  "audio/dvi4": {
    "source": "iana"
  },
  "audio/eac3": {
    "source": "iana"
  },
  "audio/encaprtp": {
    "source": "iana"
  },
  "audio/evrc": {
    "source": "iana"
  },
  "audio/evrc-qcp": {
    "source": "iana"
  },
  "audio/evrc0": {
    "source": "iana"
  },
  "audio/evrc1": {
    "source": "iana"
  },
  "audio/evrcb": {
    "source": "iana"
  },
  "audio/evrcb0": {
    "source": "iana"
  },
  "audio/evrcb1": {
    "source": "iana"
  },
  "audio/evrcnw": {
    "source": "iana"
  },
  "audio/evrcnw0": {
    "source": "iana"
  },
  "audio/evrcnw1": {
    "source": "iana"
  },
  "audio/evrcwb": {
    "source": "iana"
  },
  "audio/evrcwb0": {
    "source": "iana"
  },
  "audio/evrcwb1": {
    "source": "iana"
  },
  "audio/evs": {
    "source": "iana"
  },
  "audio/flac": {
    "source": "iana"
  },
  "audio/flexfec": {
    "source": "iana"
  },
  "audio/fwdred": {
    "source": "iana"
  },
  "audio/g711-0": {
    "source": "iana"
  },
  "audio/g719": {
    "source": "iana"
  },
  "audio/g722": {
    "source": "iana"
  },
  "audio/g7221": {
    "source": "iana"
  },
  "audio/g723": {
    "source": "iana"
  },
  "audio/g726-16": {
    "source": "iana"
  },
  "audio/g726-24": {
    "source": "iana"
  },
  "audio/g726-32": {
    "source": "iana"
  },
  "audio/g726-40": {
    "source": "iana"
  },
  "audio/g728": {
    "source": "iana"
  },
  "audio/g729": {
    "source": "iana"
  },
  "audio/g7291": {
    "source": "iana"
  },
  "audio/g729d": {
    "source": "iana"
  },
  "audio/g729e": {
    "source": "iana"
  },
  "audio/gsm": {
    "source": "iana"
  },
  "audio/gsm-efr": {
    "source": "iana"
  },
  "audio/gsm-hr-08": {
    "source": "iana"
  },
  "audio/ilbc": {
    "source": "iana"
  },
  "audio/ip-mr_v2.5": {
    "source": "iana"
  },
  "audio/isac": {
    "source": "apache"
  },
  "audio/l16": {
    "source": "iana"
  },
  "audio/l20": {
    "source": "iana"
  },
  "audio/l24": {
    "source": "iana",
    "compressible": false
  },
  "audio/l8": {
    "source": "iana"
  },
  "audio/lpc": {
    "source": "iana"
  },
  "audio/matroska": {
    "source": "iana"
  },
  "audio/melp": {
    "source": "iana"
  },
  "audio/melp1200": {
    "source": "iana"
  },
  "audio/melp2400": {
    "source": "iana"
  },
  "audio/melp600": {
    "source": "iana"
  },
  "audio/mhas": {
    "source": "iana"
  },
  "audio/midi": {
    "source": "apache",
    "extensions": [
      "mid",
      "midi",
      "kar",
      "rmi"
    ]
  },
  "audio/midi-clip": {
    "source": "iana"
  },
  "audio/mobile-xmf": {
    "source": "iana",
    "extensions": [
      "mxmf"
    ]
  },
  "audio/mp3": {
    "compressible": false,
    "extensions": [
      "mp3"
    ]
  },
  "audio/mp4": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "m4a",
      "mp4a"
    ]
  },
  "audio/mp4a-latm": {
    "source": "iana"
  },
  "audio/mpa": {
    "source": "iana"
  },
  "audio/mpa-robust": {
    "source": "iana"
  },
  "audio/mpeg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "mpga",
      "mp2",
      "mp2a",
      "mp3",
      "m2a",
      "m3a"
    ]
  },
  "audio/mpeg4-generic": {
    "source": "iana"
  },
  "audio/musepack": {
    "source": "apache"
  },
  "audio/ogg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "oga",
      "ogg",
      "spx",
      "opus"
    ]
  },
  "audio/opus": {
    "source": "iana"
  },
  "audio/parityfec": {
    "source": "iana"
  },
  "audio/pcma": {
    "source": "iana"
  },
  "audio/pcma-wb": {
    "source": "iana"
  },
  "audio/pcmu": {
    "source": "iana"
  },
  "audio/pcmu-wb": {
    "source": "iana"
  },
  "audio/prs.sid": {
    "source": "iana"
  },
  "audio/qcelp": {
    "source": "iana"
  },
  "audio/raptorfec": {
    "source": "iana"
  },
  "audio/red": {
    "source": "iana"
  },
  "audio/rtp-enc-aescm128": {
    "source": "iana"
  },
  "audio/rtp-midi": {
    "source": "iana"
  },
  "audio/rtploopback": {
    "source": "iana"
  },
  "audio/rtx": {
    "source": "iana"
  },
  "audio/s3m": {
    "source": "apache",
    "extensions": [
      "s3m"
    ]
  },
  "audio/scip": {
    "source": "iana"
  },
  "audio/silk": {
    "source": "apache",
    "extensions": [
      "sil"
    ]
  },
  "audio/smv": {
    "source": "iana"
  },
  "audio/smv-qcp": {
    "source": "iana"
  },
  "audio/smv0": {
    "source": "iana"
  },
  "audio/sofa": {
    "source": "iana"
  },
  "audio/sp-midi": {
    "source": "iana"
  },
  "audio/speex": {
    "source": "iana"
  },
  "audio/t140c": {
    "source": "iana"
  },
  "audio/t38": {
    "source": "iana"
  },
  "audio/telephone-event": {
    "source": "iana"
  },
  "audio/tetra_acelp": {
    "source": "iana"
  },
  "audio/tetra_acelp_bb": {
    "source": "iana"
  },
  "audio/tone": {
    "source": "iana"
  },
  "audio/tsvcis": {
    "source": "iana"
  },
  "audio/uemclip": {
    "source": "iana"
  },
  "audio/ulpfec": {
    "source": "iana"
  },
  "audio/usac": {
    "source": "iana"
  },
  "audio/vdvi": {
    "source": "iana"
  },
  "audio/vmr-wb": {
    "source": "iana"
  },
  "audio/vnd.3gpp.iufp": {
    "source": "iana"
  },
  "audio/vnd.4sb": {
    "source": "iana"
  },
  "audio/vnd.audiokoz": {
    "source": "iana"
  },
  "audio/vnd.celp": {
    "source": "iana"
  },
  "audio/vnd.cisco.nse": {
    "source": "iana"
  },
  "audio/vnd.cmles.radio-events": {
    "source": "iana"
  },
  "audio/vnd.cns.anp1": {
    "source": "iana"
  },
  "audio/vnd.cns.inf1": {
    "source": "iana"
  },
  "audio/vnd.dece.audio": {
    "source": "iana",
    "extensions": [
      "uva",
      "uvva"
    ]
  },
  "audio/vnd.digital-winds": {
    "source": "iana",
    "extensions": [
      "eol"
    ]
  },
  "audio/vnd.dlna.adts": {
    "source": "iana"
  },
  "audio/vnd.dolby.heaac.1": {
    "source": "iana"
  },
  "audio/vnd.dolby.heaac.2": {
    "source": "iana"
  },
  "audio/vnd.dolby.mlp": {
    "source": "iana"
  },
  "audio/vnd.dolby.mps": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2x": {
    "source": "iana"
  },
  "audio/vnd.dolby.pl2z": {
    "source": "iana"
  },
  "audio/vnd.dolby.pulse.1": {
    "source": "iana"
  },
  "audio/vnd.dra": {
    "source": "iana",
    "extensions": [
      "dra"
    ]
  },
  "audio/vnd.dts": {
    "source": "iana",
    "extensions": [
      "dts"
    ]
  },
  "audio/vnd.dts.hd": {
    "source": "iana",
    "extensions": [
      "dtshd"
    ]
  },
  "audio/vnd.dts.uhd": {
    "source": "iana"
  },
  "audio/vnd.dvb.file": {
    "source": "iana"
  },
  "audio/vnd.everad.plj": {
    "source": "iana"
  },
  "audio/vnd.hns.audio": {
    "source": "iana"
  },
  "audio/vnd.lucent.voice": {
    "source": "iana",
    "extensions": [
      "lvp"
    ]
  },
  "audio/vnd.ms-playready.media.pya": {
    "source": "iana",
    "extensions": [
      "pya"
    ]
  },
  "audio/vnd.nokia.mobile-xmf": {
    "source": "iana"
  },
  "audio/vnd.nortel.vbk": {
    "source": "iana"
  },
  "audio/vnd.nuera.ecelp4800": {
    "source": "iana",
    "extensions": [
      "ecelp4800"
    ]
  },
  "audio/vnd.nuera.ecelp7470": {
    "source": "iana",
    "extensions": [
      "ecelp7470"
    ]
  },
  "audio/vnd.nuera.ecelp9600": {
    "source": "iana",
    "extensions": [
      "ecelp9600"
    ]
  },
  "audio/vnd.octel.sbc": {
    "source": "iana"
  },
  "audio/vnd.presonus.multitrack": {
    "source": "iana"
  },
  "audio/vnd.qcelp": {
    "source": "apache"
  },
  "audio/vnd.rhetorex.32kadpcm": {
    "source": "iana"
  },
  "audio/vnd.rip": {
    "source": "iana",
    "extensions": [
      "rip"
    ]
  },
  "audio/vnd.rn-realaudio": {
    "compressible": false
  },
  "audio/vnd.sealedmedia.softseal.mpeg": {
    "source": "iana"
  },
  "audio/vnd.vmx.cvsd": {
    "source": "iana"
  },
  "audio/vnd.wave": {
    "compressible": false
  },
  "audio/vorbis": {
    "source": "iana",
    "compressible": false
  },
  "audio/vorbis-config": {
    "source": "iana"
  },
  "audio/wav": {
    "compressible": false,
    "extensions": [
      "wav"
    ]
  },
  "audio/wave": {
    "compressible": false,
    "extensions": [
      "wav"
    ]
  },
  "audio/webm": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "weba"
    ]
  },
  "audio/x-aac": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "aac"
    ]
  },
  "audio/x-aiff": {
    "source": "apache",
    "extensions": [
      "aif",
      "aiff",
      "aifc"
    ]
  },
  "audio/x-caf": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "caf"
    ]
  },
  "audio/x-flac": {
    "source": "apache",
    "extensions": [
      "flac"
    ]
  },
  "audio/x-m4a": {
    "source": "nginx",
    "extensions": [
      "m4a"
    ]
  },
  "audio/x-matroska": {
    "source": "apache",
    "extensions": [
      "mka"
    ]
  },
  "audio/x-mpegurl": {
    "source": "apache",
    "extensions": [
      "m3u"
    ]
  },
  "audio/x-ms-wax": {
    "source": "apache",
    "extensions": [
      "wax"
    ]
  },
  "audio/x-ms-wma": {
    "source": "apache",
    "extensions": [
      "wma"
    ]
  },
  "audio/x-pn-realaudio": {
    "source": "apache",
    "extensions": [
      "ram",
      "ra"
    ]
  },
  "audio/x-pn-realaudio-plugin": {
    "source": "apache",
    "extensions": [
      "rmp"
    ]
  },
  "audio/x-realaudio": {
    "source": "nginx",
    "extensions": [
      "ra"
    ]
  },
  "audio/x-tta": {
    "source": "apache"
  },
  "audio/x-wav": {
    "source": "apache",
    "extensions": [
      "wav"
    ]
  },
  "audio/xm": {
    "source": "apache",
    "extensions": [
      "xm"
    ]
  },
  "chemical/x-cdx": {
    "source": "apache",
    "extensions": [
      "cdx"
    ]
  },
  "chemical/x-cif": {
    "source": "apache",
    "extensions": [
      "cif"
    ]
  },
  "chemical/x-cmdf": {
    "source": "apache",
    "extensions": [
      "cmdf"
    ]
  },
  "chemical/x-cml": {
    "source": "apache",
    "extensions": [
      "cml"
    ]
  },
  "chemical/x-csml": {
    "source": "apache",
    "extensions": [
      "csml"
    ]
  },
  "chemical/x-pdb": {
    "source": "apache"
  },
  "chemical/x-xyz": {
    "source": "apache",
    "extensions": [
      "xyz"
    ]
  },
  "font/collection": {
    "source": "iana",
    "extensions": [
      "ttc"
    ]
  },
  "font/otf": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "otf"
    ]
  },
  "font/sfnt": {
    "source": "iana"
  },
  "font/ttf": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ttf"
    ]
  },
  "font/woff": {
    "source": "iana",
    "extensions": [
      "woff"
    ]
  },
  "font/woff2": {
    "source": "iana",
    "extensions": [
      "woff2"
    ]
  },
  "image/aces": {
    "source": "iana",
    "extensions": [
      "exr"
    ]
  },
  "image/apng": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "apng"
    ]
  },
  "image/avci": {
    "source": "iana",
    "extensions": [
      "avci"
    ]
  },
  "image/avcs": {
    "source": "iana",
    "extensions": [
      "avcs"
    ]
  },
  "image/avif": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "avif"
    ]
  },
  "image/bmp": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "bmp",
      "dib"
    ]
  },
  "image/cgm": {
    "source": "iana",
    "extensions": [
      "cgm"
    ]
  },
  "image/dicom-rle": {
    "source": "iana",
    "extensions": [
      "drle"
    ]
  },
  "image/dpx": {
    "source": "iana",
    "extensions": [
      "dpx"
    ]
  },
  "image/emf": {
    "source": "iana",
    "extensions": [
      "emf"
    ]
  },
  "image/fits": {
    "source": "iana",
    "extensions": [
      "fits"
    ]
  },
  "image/g3fax": {
    "source": "iana",
    "extensions": [
      "g3"
    ]
  },
  "image/gif": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "gif"
    ]
  },
  "image/heic": {
    "source": "iana",
    "extensions": [
      "heic"
    ]
  },
  "image/heic-sequence": {
    "source": "iana",
    "extensions": [
      "heics"
    ]
  },
  "image/heif": {
    "source": "iana",
    "extensions": [
      "heif"
    ]
  },
  "image/heif-sequence": {
    "source": "iana",
    "extensions": [
      "heifs"
    ]
  },
  "image/hej2k": {
    "source": "iana",
    "extensions": [
      "hej2"
    ]
  },
  "image/hsj2": {
    "source": "iana",
    "extensions": [
      "hsj2"
    ]
  },
  "image/ief": {
    "source": "iana",
    "extensions": [
      "ief"
    ]
  },
  "image/j2c": {
    "source": "iana"
  },
  "image/jls": {
    "source": "iana",
    "extensions": [
      "jls"
    ]
  },
  "image/jp2": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "jp2",
      "jpg2"
    ]
  },
  "image/jpeg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "jpeg",
      "jpg",
      "jpe"
    ]
  },
  "image/jph": {
    "source": "iana",
    "extensions": [
      "jph"
    ]
  },
  "image/jphc": {
    "source": "iana",
    "extensions": [
      "jhc"
    ]
  },
  "image/jpm": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "jpm",
      "jpgm"
    ]
  },
  "image/jpx": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "jpx",
      "jpf"
    ]
  },
  "image/jxl": {
    "source": "iana",
    "extensions": [
      "jxl"
    ]
  },
  "image/jxr": {
    "source": "iana",
    "extensions": [
      "jxr"
    ]
  },
  "image/jxra": {
    "source": "iana",
    "extensions": [
      "jxra"
    ]
  },
  "image/jxrs": {
    "source": "iana",
    "extensions": [
      "jxrs"
    ]
  },
  "image/jxs": {
    "source": "iana",
    "extensions": [
      "jxs"
    ]
  },
  "image/jxsc": {
    "source": "iana",
    "extensions": [
      "jxsc"
    ]
  },
  "image/jxsi": {
    "source": "iana",
    "extensions": [
      "jxsi"
    ]
  },
  "image/jxss": {
    "source": "iana",
    "extensions": [
      "jxss"
    ]
  },
  "image/ktx": {
    "source": "iana",
    "extensions": [
      "ktx"
    ]
  },
  "image/ktx2": {
    "source": "iana",
    "extensions": [
      "ktx2"
    ]
  },
  "image/naplps": {
    "source": "iana"
  },
  "image/pjpeg": {
    "compressible": false
  },
  "image/png": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "png"
    ]
  },
  "image/prs.btif": {
    "source": "iana",
    "extensions": [
      "btif",
      "btf"
    ]
  },
  "image/prs.pti": {
    "source": "iana",
    "extensions": [
      "pti"
    ]
  },
  "image/pwg-raster": {
    "source": "iana"
  },
  "image/sgi": {
    "source": "apache",
    "extensions": [
      "sgi"
    ]
  },
  "image/svg+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "svg",
      "svgz"
    ]
  },
  "image/t38": {
    "source": "iana",
    "extensions": [
      "t38"
    ]
  },
  "image/tiff": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "tif",
      "tiff"
    ]
  },
  "image/tiff-fx": {
    "source": "iana",
    "extensions": [
      "tfx"
    ]
  },
  "image/vnd.adobe.photoshop": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "psd"
    ]
  },
  "image/vnd.airzip.accelerator.azv": {
    "source": "iana",
    "extensions": [
      "azv"
    ]
  },
  "image/vnd.cns.inf2": {
    "source": "iana"
  },
  "image/vnd.dece.graphic": {
    "source": "iana",
    "extensions": [
      "uvi",
      "uvvi",
      "uvg",
      "uvvg"
    ]
  },
  "image/vnd.djvu": {
    "source": "iana",
    "extensions": [
      "djvu",
      "djv"
    ]
  },
  "image/vnd.dvb.subtitle": {
    "source": "iana",
    "extensions": [
      "sub"
    ]
  },
  "image/vnd.dwg": {
    "source": "iana",
    "extensions": [
      "dwg"
    ]
  },
  "image/vnd.dxf": {
    "source": "iana",
    "extensions": [
      "dxf"
    ]
  },
  "image/vnd.fastbidsheet": {
    "source": "iana",
    "extensions": [
      "fbs"
    ]
  },
  "image/vnd.fpx": {
    "source": "iana",
    "extensions": [
      "fpx"
    ]
  },
  "image/vnd.fst": {
    "source": "iana",
    "extensions": [
      "fst"
    ]
  },
  "image/vnd.fujixerox.edmics-mmr": {
    "source": "iana",
    "extensions": [
      "mmr"
    ]
  },
  "image/vnd.fujixerox.edmics-rlc": {
    "source": "iana",
    "extensions": [
      "rlc"
    ]
  },
  "image/vnd.globalgraphics.pgb": {
    "source": "iana"
  },
  "image/vnd.microsoft.icon": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "ico"
    ]
  },
  "image/vnd.mix": {
    "source": "iana"
  },
  "image/vnd.mozilla.apng": {
    "source": "iana"
  },
  "image/vnd.ms-dds": {
    "compressible": true,
    "extensions": [
      "dds"
    ]
  },
  "image/vnd.ms-modi": {
    "source": "iana",
    "extensions": [
      "mdi"
    ]
  },
  "image/vnd.ms-photo": {
    "source": "apache",
    "extensions": [
      "wdp"
    ]
  },
  "image/vnd.net-fpx": {
    "source": "iana",
    "extensions": [
      "npx"
    ]
  },
  "image/vnd.pco.b16": {
    "source": "iana",
    "extensions": [
      "b16"
    ]
  },
  "image/vnd.radiance": {
    "source": "iana"
  },
  "image/vnd.sealed.png": {
    "source": "iana"
  },
  "image/vnd.sealedmedia.softseal.gif": {
    "source": "iana"
  },
  "image/vnd.sealedmedia.softseal.jpg": {
    "source": "iana"
  },
  "image/vnd.svf": {
    "source": "iana"
  },
  "image/vnd.tencent.tap": {
    "source": "iana",
    "extensions": [
      "tap"
    ]
  },
  "image/vnd.valve.source.texture": {
    "source": "iana",
    "extensions": [
      "vtf"
    ]
  },
  "image/vnd.wap.wbmp": {
    "source": "iana",
    "extensions": [
      "wbmp"
    ]
  },
  "image/vnd.xiff": {
    "source": "iana",
    "extensions": [
      "xif"
    ]
  },
  "image/vnd.zbrush.pcx": {
    "source": "iana",
    "extensions": [
      "pcx"
    ]
  },
  "image/webp": {
    "source": "iana",
    "extensions": [
      "webp"
    ]
  },
  "image/wmf": {
    "source": "iana",
    "extensions": [
      "wmf"
    ]
  },
  "image/x-3ds": {
    "source": "apache",
    "extensions": [
      "3ds"
    ]
  },
  "image/x-cmu-raster": {
    "source": "apache",
    "extensions": [
      "ras"
    ]
  },
  "image/x-cmx": {
    "source": "apache",
    "extensions": [
      "cmx"
    ]
  },
  "image/x-freehand": {
    "source": "apache",
    "extensions": [
      "fh",
      "fhc",
      "fh4",
      "fh5",
      "fh7"
    ]
  },
  "image/x-icon": {
    "source": "apache",
    "compressible": true,
    "extensions": [
      "ico"
    ]
  },
  "image/x-jng": {
    "source": "nginx",
    "extensions": [
      "jng"
    ]
  },
  "image/x-mrsid-image": {
    "source": "apache",
    "extensions": [
      "sid"
    ]
  },
  "image/x-ms-bmp": {
    "source": "nginx",
    "compressible": true,
    "extensions": [
      "bmp"
    ]
  },
  "image/x-pcx": {
    "source": "apache",
    "extensions": [
      "pcx"
    ]
  },
  "image/x-pict": {
    "source": "apache",
    "extensions": [
      "pic",
      "pct"
    ]
  },
  "image/x-portable-anymap": {
    "source": "apache",
    "extensions": [
      "pnm"
    ]
  },
  "image/x-portable-bitmap": {
    "source": "apache",
    "extensions": [
      "pbm"
    ]
  },
  "image/x-portable-graymap": {
    "source": "apache",
    "extensions": [
      "pgm"
    ]
  },
  "image/x-portable-pixmap": {
    "source": "apache",
    "extensions": [
      "ppm"
    ]
  },
  "image/x-rgb": {
    "source": "apache",
    "extensions": [
      "rgb"
    ]
  },
  "image/x-tga": {
    "source": "apache",
    "extensions": [
      "tga"
    ]
  },
  "image/x-xbitmap": {
    "source": "apache",
    "extensions": [
      "xbm"
    ]
  },
  "image/x-xcf": {
    "compressible": false
  },
  "image/x-xpixmap": {
    "source": "apache",
    "extensions": [
      "xpm"
    ]
  },
  "image/x-xwindowdump": {
    "source": "apache",
    "extensions": [
      "xwd"
    ]
  },
  "message/bhttp": {
    "source": "iana"
  },
  "message/cpim": {
    "source": "iana"
  },
  "message/delivery-status": {
    "source": "iana"
  },
  "message/disposition-notification": {
    "source": "iana",
    "extensions": [
      "disposition-notification"
    ]
  },
  "message/external-body": {
    "source": "iana"
  },
  "message/feedback-report": {
    "source": "iana"
  },
  "message/global": {
    "source": "iana",
    "extensions": [
      "u8msg"
    ]
  },
  "message/global-delivery-status": {
    "source": "iana",
    "extensions": [
      "u8dsn"
    ]
  },
  "message/global-disposition-notification": {
    "source": "iana",
    "extensions": [
      "u8mdn"
    ]
  },
  "message/global-headers": {
    "source": "iana",
    "extensions": [
      "u8hdr"
    ]
  },
  "message/http": {
    "source": "iana",
    "compressible": false
  },
  "message/imdn+xml": {
    "source": "iana",
    "compressible": true
  },
  "message/mls": {
    "source": "iana"
  },
  "message/news": {
    "source": "apache"
  },
  "message/ohttp-req": {
    "source": "iana"
  },
  "message/ohttp-res": {
    "source": "iana"
  },
  "message/partial": {
    "source": "iana",
    "compressible": false
  },
  "message/rfc822": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "eml",
      "mime"
    ]
  },
  "message/s-http": {
    "source": "apache"
  },
  "message/sip": {
    "source": "iana"
  },
  "message/sipfrag": {
    "source": "iana"
  },
  "message/tracking-status": {
    "source": "iana"
  },
  "message/vnd.si.simp": {
    "source": "apache"
  },
  "message/vnd.wfa.wsc": {
    "source": "iana",
    "extensions": [
      "wsc"
    ]
  },
  "model/3mf": {
    "source": "iana",
    "extensions": [
      "3mf"
    ]
  },
  "model/e57": {
    "source": "iana"
  },
  "model/gltf+json": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "gltf"
    ]
  },
  "model/gltf-binary": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "glb"
    ]
  },
  "model/iges": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "igs",
      "iges"
    ]
  },
  "model/jt": {
    "source": "iana",
    "extensions": [
      "jt"
    ]
  },
  "model/mesh": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "msh",
      "mesh",
      "silo"
    ]
  },
  "model/mtl": {
    "source": "iana",
    "extensions": [
      "mtl"
    ]
  },
  "model/obj": {
    "source": "iana",
    "extensions": [
      "obj"
    ]
  },
  "model/prc": {
    "source": "iana",
    "extensions": [
      "prc"
    ]
  },
  "model/step": {
    "source": "iana"
  },
  "model/step+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "stpx"
    ]
  },
  "model/step+zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "stpz"
    ]
  },
  "model/step-xml+zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "stpxz"
    ]
  },
  "model/stl": {
    "source": "iana",
    "extensions": [
      "stl"
    ]
  },
  "model/u3d": {
    "source": "iana",
    "extensions": [
      "u3d"
    ]
  },
  "model/vnd.bary": {
    "source": "iana",
    "extensions": [
      "bary"
    ]
  },
  "model/vnd.cld": {
    "source": "iana",
    "extensions": [
      "cld"
    ]
  },
  "model/vnd.collada+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "dae"
    ]
  },
  "model/vnd.dwf": {
    "source": "iana",
    "extensions": [
      "dwf"
    ]
  },
  "model/vnd.flatland.3dml": {
    "source": "iana"
  },
  "model/vnd.gdl": {
    "source": "iana",
    "extensions": [
      "gdl"
    ]
  },
  "model/vnd.gs-gdl": {
    "source": "apache"
  },
  "model/vnd.gs.gdl": {
    "source": "iana"
  },
  "model/vnd.gtw": {
    "source": "iana",
    "extensions": [
      "gtw"
    ]
  },
  "model/vnd.moml+xml": {
    "source": "iana",
    "compressible": true
  },
  "model/vnd.mts": {
    "source": "iana",
    "extensions": [
      "mts"
    ]
  },
  "model/vnd.opengex": {
    "source": "iana",
    "extensions": [
      "ogex"
    ]
  },
  "model/vnd.parasolid.transmit.binary": {
    "source": "iana",
    "extensions": [
      "x_b"
    ]
  },
  "model/vnd.parasolid.transmit.text": {
    "source": "iana",
    "extensions": [
      "x_t"
    ]
  },
  "model/vnd.pytha.pyox": {
    "source": "iana",
    "extensions": [
      "pyo",
      "pyox"
    ]
  },
  "model/vnd.rosette.annotated-data-model": {
    "source": "iana"
  },
  "model/vnd.sap.vds": {
    "source": "iana",
    "extensions": [
      "vds"
    ]
  },
  "model/vnd.usda": {
    "source": "iana",
    "extensions": [
      "usda"
    ]
  },
  "model/vnd.usdz+zip": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "usdz"
    ]
  },
  "model/vnd.valve.source.compiled-map": {
    "source": "iana",
    "extensions": [
      "bsp"
    ]
  },
  "model/vnd.vtu": {
    "source": "iana",
    "extensions": [
      "vtu"
    ]
  },
  "model/vrml": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "wrl",
      "vrml"
    ]
  },
  "model/x3d+binary": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "x3db",
      "x3dbz"
    ]
  },
  "model/x3d+fastinfoset": {
    "source": "iana",
    "extensions": [
      "x3db"
    ]
  },
  "model/x3d+vrml": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "x3dv",
      "x3dvz"
    ]
  },
  "model/x3d+xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "x3d",
      "x3dz"
    ]
  },
  "model/x3d-vrml": {
    "source": "iana",
    "extensions": [
      "x3dv"
    ]
  },
  "multipart/alternative": {
    "source": "iana",
    "compressible": false
  },
  "multipart/appledouble": {
    "source": "iana"
  },
  "multipart/byteranges": {
    "source": "iana"
  },
  "multipart/digest": {
    "source": "iana"
  },
  "multipart/encrypted": {
    "source": "iana",
    "compressible": false
  },
  "multipart/form-data": {
    "source": "iana",
    "compressible": false
  },
  "multipart/header-set": {
    "source": "iana"
  },
  "multipart/mixed": {
    "source": "iana"
  },
  "multipart/multilingual": {
    "source": "iana"
  },
  "multipart/parallel": {
    "source": "iana"
  },
  "multipart/related": {
    "source": "iana",
    "compressible": false
  },
  "multipart/report": {
    "source": "iana"
  },
  "multipart/signed": {
    "source": "iana",
    "compressible": false
  },
  "multipart/vnd.bint.med-plus": {
    "source": "iana"
  },
  "multipart/voice-message": {
    "source": "iana"
  },
  "multipart/x-mixed-replace": {
    "source": "iana"
  },
  "text/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "text/cache-manifest": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "appcache",
      "manifest"
    ]
  },
  "text/calendar": {
    "source": "iana",
    "extensions": [
      "ics",
      "ifb"
    ]
  },
  "text/calender": {
    "compressible": true
  },
  "text/cmd": {
    "compressible": true
  },
  "text/coffeescript": {
    "extensions": [
      "coffee",
      "litcoffee"
    ]
  },
  "text/cql": {
    "source": "iana"
  },
  "text/cql-expression": {
    "source": "iana"
  },
  "text/cql-identifier": {
    "source": "iana"
  },
  "text/css": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "css"
    ]
  },
  "text/csv": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "csv"
    ]
  },
  "text/csv-schema": {
    "source": "iana"
  },
  "text/directory": {
    "source": "iana"
  },
  "text/dns": {
    "source": "iana"
  },
  "text/ecmascript": {
    "source": "apache"
  },
  "text/encaprtp": {
    "source": "iana"
  },
  "text/enriched": {
    "source": "iana"
  },
  "text/fhirpath": {
    "source": "iana"
  },
  "text/flexfec": {
    "source": "iana"
  },
  "text/fwdred": {
    "source": "iana"
  },
  "text/gff3": {
    "source": "iana"
  },
  "text/grammar-ref-list": {
    "source": "iana"
  },
  "text/hl7v2": {
    "source": "iana"
  },
  "text/html": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "html",
      "htm",
      "shtml"
    ]
  },
  "text/jade": {
    "extensions": [
      "jade"
    ]
  },
  "text/javascript": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "js",
      "mjs"
    ]
  },
  "text/jcr-cnd": {
    "source": "iana"
  },
  "text/jsx": {
    "compressible": true,
    "extensions": [
      "jsx"
    ]
  },
  "text/less": {
    "compressible": true,
    "extensions": [
      "less"
    ]
  },
  "text/markdown": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "md",
      "markdown"
    ]
  },
  "text/mathml": {
    "source": "nginx",
    "extensions": [
      "mml"
    ]
  },
  "text/mdx": {
    "compressible": true,
    "extensions": [
      "mdx"
    ]
  },
  "text/mizar": {
    "source": "iana"
  },
  "text/n3": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "n3"
    ]
  },
  "text/parameters": {
    "source": "iana",
    "charset": "UTF-8"
  },
  "text/parityfec": {
    "source": "iana"
  },
  "text/plain": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "txt",
      "text",
      "conf",
      "def",
      "list",
      "log",
      "in",
      "ini"
    ]
  },
  "text/provenance-notation": {
    "source": "iana",
    "charset": "UTF-8"
  },
  "text/prs.fallenstein.rst": {
    "source": "iana"
  },
  "text/prs.lines.tag": {
    "source": "iana",
    "extensions": [
      "dsc"
    ]
  },
  "text/prs.prop.logic": {
    "source": "iana"
  },
  "text/prs.texi": {
    "source": "iana"
  },
  "text/raptorfec": {
    "source": "iana"
  },
  "text/red": {
    "source": "iana"
  },
  "text/rfc822-headers": {
    "source": "iana"
  },
  "text/richtext": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rtx"
    ]
  },
  "text/rtf": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "rtf"
    ]
  },
  "text/rtp-enc-aescm128": {
    "source": "iana"
  },
  "text/rtploopback": {
    "source": "iana"
  },
  "text/rtx": {
    "source": "iana"
  },
  "text/sgml": {
    "source": "iana",
    "extensions": [
      "sgml",
      "sgm"
    ]
  },
  "text/shaclc": {
    "source": "iana"
  },
  "text/shex": {
    "source": "iana",
    "extensions": [
      "shex"
    ]
  },
  "text/slim": {
    "extensions": [
      "slim",
      "slm"
    ]
  },
  "text/spdx": {
    "source": "iana",
    "extensions": [
      "spdx"
    ]
  },
  "text/strings": {
    "source": "iana"
  },
  "text/stylus": {
    "extensions": [
      "stylus",
      "styl"
    ]
  },
  "text/t140": {
    "source": "iana"
  },
  "text/tab-separated-values": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "tsv"
    ]
  },
  "text/troff": {
    "source": "iana",
    "extensions": [
      "t",
      "tr",
      "roff",
      "man",
      "me",
      "ms"
    ]
  },
  "text/turtle": {
    "source": "iana",
    "charset": "UTF-8",
    "extensions": [
      "ttl"
    ]
  },
  "text/ulpfec": {
    "source": "iana"
  },
  "text/uri-list": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "uri",
      "uris",
      "urls"
    ]
  },
  "text/vcard": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "vcard"
    ]
  },
  "text/vnd.a": {
    "source": "iana"
  },
  "text/vnd.abc": {
    "source": "iana"
  },
  "text/vnd.ascii-art": {
    "source": "iana"
  },
  "text/vnd.curl": {
    "source": "iana",
    "extensions": [
      "curl"
    ]
  },
  "text/vnd.curl.dcurl": {
    "source": "apache",
    "extensions": [
      "dcurl"
    ]
  },
  "text/vnd.curl.mcurl": {
    "source": "apache",
    "extensions": [
      "mcurl"
    ]
  },
  "text/vnd.curl.scurl": {
    "source": "apache",
    "extensions": [
      "scurl"
    ]
  },
  "text/vnd.debian.copyright": {
    "source": "iana",
    "charset": "UTF-8"
  },
  "text/vnd.dmclientscript": {
    "source": "iana"
  },
  "text/vnd.dvb.subtitle": {
    "source": "iana",
    "extensions": [
      "sub"
    ]
  },
  "text/vnd.esmertec.theme-descriptor": {
    "source": "iana",
    "charset": "UTF-8"
  },
  "text/vnd.exchangeable": {
    "source": "iana"
  },
  "text/vnd.familysearch.gedcom": {
    "source": "iana",
    "extensions": [
      "ged"
    ]
  },
  "text/vnd.ficlab.flt": {
    "source": "iana"
  },
  "text/vnd.fly": {
    "source": "iana",
    "extensions": [
      "fly"
    ]
  },
  "text/vnd.fmi.flexstor": {
    "source": "iana",
    "extensions": [
      "flx"
    ]
  },
  "text/vnd.gml": {
    "source": "iana"
  },
  "text/vnd.graphviz": {
    "source": "iana",
    "extensions": [
      "gv"
    ]
  },
  "text/vnd.hans": {
    "source": "iana"
  },
  "text/vnd.hgl": {
    "source": "iana"
  },
  "text/vnd.in3d.3dml": {
    "source": "iana",
    "extensions": [
      "3dml"
    ]
  },
  "text/vnd.in3d.spot": {
    "source": "iana",
    "extensions": [
      "spot"
    ]
  },
  "text/vnd.iptc.newsml": {
    "source": "iana"
  },
  "text/vnd.iptc.nitf": {
    "source": "iana"
  },
  "text/vnd.latex-z": {
    "source": "iana"
  },
  "text/vnd.motorola.reflex": {
    "source": "iana"
  },
  "text/vnd.ms-mediapackage": {
    "source": "iana"
  },
  "text/vnd.net2phone.commcenter.command": {
    "source": "iana"
  },
  "text/vnd.radisys.msml-basic-layout": {
    "source": "iana"
  },
  "text/vnd.senx.warpscript": {
    "source": "iana"
  },
  "text/vnd.si.uricatalogue": {
    "source": "apache"
  },
  "text/vnd.sosi": {
    "source": "iana"
  },
  "text/vnd.sun.j2me.app-descriptor": {
    "source": "iana",
    "charset": "UTF-8",
    "extensions": [
      "jad"
    ]
  },
  "text/vnd.trolltech.linguist": {
    "source": "iana",
    "charset": "UTF-8"
  },
  "text/vnd.vcf": {
    "source": "iana"
  },
  "text/vnd.wap.si": {
    "source": "iana"
  },
  "text/vnd.wap.sl": {
    "source": "iana"
  },
  "text/vnd.wap.wml": {
    "source": "iana",
    "extensions": [
      "wml"
    ]
  },
  "text/vnd.wap.wmlscript": {
    "source": "iana",
    "extensions": [
      "wmls"
    ]
  },
  "text/vnd.zoo.kcl": {
    "source": "iana"
  },
  "text/vtt": {
    "source": "iana",
    "charset": "UTF-8",
    "compressible": true,
    "extensions": [
      "vtt"
    ]
  },
  "text/wgsl": {
    "source": "iana",
    "extensions": [
      "wgsl"
    ]
  },
  "text/x-asm": {
    "source": "apache",
    "extensions": [
      "s",
      "asm"
    ]
  },
  "text/x-c": {
    "source": "apache",
    "extensions": [
      "c",
      "cc",
      "cxx",
      "cpp",
      "h",
      "hh",
      "dic"
    ]
  },
  "text/x-component": {
    "source": "nginx",
    "extensions": [
      "htc"
    ]
  },
  "text/x-fortran": {
    "source": "apache",
    "extensions": [
      "f",
      "for",
      "f77",
      "f90"
    ]
  },
  "text/x-gwt-rpc": {
    "compressible": true
  },
  "text/x-handlebars-template": {
    "extensions": [
      "hbs"
    ]
  },
  "text/x-java-source": {
    "source": "apache",
    "extensions": [
      "java"
    ]
  },
  "text/x-jquery-tmpl": {
    "compressible": true
  },
  "text/x-lua": {
    "extensions": [
      "lua"
    ]
  },
  "text/x-markdown": {
    "compressible": true,
    "extensions": [
      "mkd"
    ]
  },
  "text/x-nfo": {
    "source": "apache",
    "extensions": [
      "nfo"
    ]
  },
  "text/x-opml": {
    "source": "apache",
    "extensions": [
      "opml"
    ]
  },
  "text/x-org": {
    "compressible": true,
    "extensions": [
      "org"
    ]
  },
  "text/x-pascal": {
    "source": "apache",
    "extensions": [
      "p",
      "pas"
    ]
  },
  "text/x-processing": {
    "compressible": true,
    "extensions": [
      "pde"
    ]
  },
  "text/x-sass": {
    "extensions": [
      "sass"
    ]
  },
  "text/x-scss": {
    "extensions": [
      "scss"
    ]
  },
  "text/x-setext": {
    "source": "apache",
    "extensions": [
      "etx"
    ]
  },
  "text/x-sfv": {
    "source": "apache",
    "extensions": [
      "sfv"
    ]
  },
  "text/x-suse-ymp": {
    "compressible": true,
    "extensions": [
      "ymp"
    ]
  },
  "text/x-uuencode": {
    "source": "apache",
    "extensions": [
      "uu"
    ]
  },
  "text/x-vcalendar": {
    "source": "apache",
    "extensions": [
      "vcs"
    ]
  },
  "text/x-vcard": {
    "source": "apache",
    "extensions": [
      "vcf"
    ]
  },
  "text/xml": {
    "source": "iana",
    "compressible": true,
    "extensions": [
      "xml"
    ]
  },
  "text/xml-external-parsed-entity": {
    "source": "iana"
  },
  "text/yaml": {
    "compressible": true,
    "extensions": [
      "yaml",
      "yml"
    ]
  },
  "video/1d-interleaved-parityfec": {
    "source": "iana"
  },
  "video/3gpp": {
    "source": "iana",
    "extensions": [
      "3gp",
      "3gpp"
    ]
  },
  "video/3gpp-tt": {
    "source": "iana"
  },
  "video/3gpp2": {
    "source": "iana",
    "extensions": [
      "3g2"
    ]
  },
  "video/av1": {
    "source": "iana"
  },
  "video/bmpeg": {
    "source": "iana"
  },
  "video/bt656": {
    "source": "iana"
  },
  "video/celb": {
    "source": "iana"
  },
  "video/dv": {
    "source": "iana"
  },
  "video/encaprtp": {
    "source": "iana"
  },
  "video/evc": {
    "source": "iana"
  },
  "video/ffv1": {
    "source": "iana"
  },
  "video/flexfec": {
    "source": "iana"
  },
  "video/h261": {
    "source": "iana",
    "extensions": [
      "h261"
    ]
  },
  "video/h263": {
    "source": "iana",
    "extensions": [
      "h263"
    ]
  },
  "video/h263-1998": {
    "source": "iana"
  },
  "video/h263-2000": {
    "source": "iana"
  },
  "video/h264": {
    "source": "iana",
    "extensions": [
      "h264"
    ]
  },
  "video/h264-rcdo": {
    "source": "iana"
  },
  "video/h264-svc": {
    "source": "iana"
  },
  "video/h265": {
    "source": "iana"
  },
  "video/h266": {
    "source": "iana"
  },
  "video/iso.segment": {
    "source": "iana",
    "extensions": [
      "m4s"
    ]
  },
  "video/jpeg": {
    "source": "iana",
    "extensions": [
      "jpgv"
    ]
  },
  "video/jpeg2000": {
    "source": "iana"
  },
  "video/jpm": {
    "source": "apache",
    "extensions": [
      "jpm",
      "jpgm"
    ]
  },
  "video/jxsv": {
    "source": "iana"
  },
  "video/matroska": {
    "source": "iana"
  },
  "video/matroska-3d": {
    "source": "iana"
  },
  "video/mj2": {
    "source": "iana",
    "extensions": [
      "mj2",
      "mjp2"
    ]
  },
  "video/mp1s": {
    "source": "iana"
  },
  "video/mp2p": {
    "source": "iana"
  },
  "video/mp2t": {
    "source": "iana",
    "extensions": [
      "ts",
      "m2t",
      "m2ts",
      "mts"
    ]
  },
  "video/mp4": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "mp4",
      "mp4v",
      "mpg4"
    ]
  },
  "video/mp4v-es": {
    "source": "iana"
  },
  "video/mpeg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "mpeg",
      "mpg",
      "mpe",
      "m1v",
      "m2v"
    ]
  },
  "video/mpeg4-generic": {
    "source": "iana"
  },
  "video/mpv": {
    "source": "iana"
  },
  "video/nv": {
    "source": "iana"
  },
  "video/ogg": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "ogv"
    ]
  },
  "video/parityfec": {
    "source": "iana"
  },
  "video/pointer": {
    "source": "iana"
  },
  "video/quicktime": {
    "source": "iana",
    "compressible": false,
    "extensions": [
      "qt",
      "mov"
    ]
  },
  "video/raptorfec": {
    "source": "iana"
  },
  "video/raw": {
    "source": "iana"
  },
  "video/rtp-enc-aescm128": {
    "source": "iana"
  },
  "video/rtploopback": {
    "source": "iana"
  },
  "video/rtx": {
    "source": "iana"
  },
  "video/scip": {
    "source": "iana"
  },
  "video/smpte291": {
    "source": "iana"
  },
  "video/smpte292m": {
    "source": "iana"
  },
  "video/ulpfec": {
    "source": "iana"
  },
  "video/vc1": {
    "source": "iana"
  },
  "video/vc2": {
    "source": "iana"
  },
  "video/vnd.cctv": {
    "source": "iana"
  },
  "video/vnd.dece.hd": {
    "source": "iana",
    "extensions": [
      "uvh",
      "uvvh"
    ]
  },
  "video/vnd.dece.mobile": {
    "source": "iana",
    "extensions": [
      "uvm",
      "uvvm"
    ]
  },
  "video/vnd.dece.mp4": {
    "source": "iana"
  },
  "video/vnd.dece.pd": {
    "source": "iana",
    "extensions": [
      "uvp",
      "uvvp"
    ]
  },
  "video/vnd.dece.sd": {
    "source": "iana",
    "extensions": [
      "uvs",
      "uvvs"
    ]
  },
  "video/vnd.dece.video": {
    "source": "iana",
    "extensions": [
      "uvv",
      "uvvv"
    ]
  },
  "video/vnd.directv.mpeg": {
    "source": "iana"
  },
  "video/vnd.directv.mpeg-tts": {
    "source": "iana"
  },
  "video/vnd.dlna.mpeg-tts": {
    "source": "iana"
  },
  "video/vnd.dvb.file": {
    "source": "iana",
    "extensions": [
      "dvb"
    ]
  },
  "video/vnd.fvt": {
    "source": "iana",
    "extensions": [
      "fvt"
    ]
  },
  "video/vnd.hns.video": {
    "source": "iana"
  },
  "video/vnd.iptvforum.1dparityfec-1010": {
    "source": "iana"
  },
  "video/vnd.iptvforum.1dparityfec-2005": {
    "source": "iana"
  },
  "video/vnd.iptvforum.2dparityfec-1010": {
    "source": "iana"
  },
  "video/vnd.iptvforum.2dparityfec-2005": {
    "source": "iana"
  },
  "video/vnd.iptvforum.ttsavc": {
    "source": "iana"
  },
  "video/vnd.iptvforum.ttsmpeg2": {
    "source": "iana"
  },
  "video/vnd.motorola.video": {
    "source": "iana"
  },
  "video/vnd.motorola.videop": {
    "source": "iana"
  },
  "video/vnd.mpegurl": {
    "source": "iana",
    "extensions": [
      "mxu",
      "m4u"
    ]
  },
  "video/vnd.ms-playready.media.pyv": {
    "source": "iana",
    "extensions": [
      "pyv"
    ]
  },
  "video/vnd.nokia.interleaved-multimedia": {
    "source": "iana"
  },
  "video/vnd.nokia.mp4vr": {
    "source": "iana"
  },
  "video/vnd.nokia.videovoip": {
    "source": "iana"
  },
  "video/vnd.objectvideo": {
    "source": "iana"
  },
  "video/vnd.radgamettools.bink": {
    "source": "iana"
  },
  "video/vnd.radgamettools.smacker": {
    "source": "apache"
  },
  "video/vnd.sealed.mpeg1": {
    "source": "iana"
  },
  "video/vnd.sealed.mpeg4": {
    "source": "iana"
  },
  "video/vnd.sealed.swf": {
    "source": "iana"
  },
  "video/vnd.sealedmedia.softseal.mov": {
    "source": "iana"
  },
  "video/vnd.uvvu.mp4": {
    "source": "iana",
    "extensions": [
      "uvu",
      "uvvu"
    ]
  },
  "video/vnd.vivo": {
    "source": "iana",
    "extensions": [
      "viv"
    ]
  },
  "video/vnd.youtube.yt": {
    "source": "iana"
  },
  "video/vp8": {
    "source": "iana"
  },
  "video/vp9": {
    "source": "iana"
  },
  "video/webm": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "webm"
    ]
  },
  "video/x-f4v": {
    "source": "apache",
    "extensions": [
      "f4v"
    ]
  },
  "video/x-fli": {
    "source": "apache",
    "extensions": [
      "fli"
    ]
  },
  "video/x-flv": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "flv"
    ]
  },
  "video/x-m4v": {
    "source": "apache",
    "extensions": [
      "m4v"
    ]
  },
  "video/x-matroska": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "mkv",
      "mk3d",
      "mks"
    ]
  },
  "video/x-mng": {
    "source": "apache",
    "extensions": [
      "mng"
    ]
  },
  "video/x-ms-asf": {
    "source": "apache",
    "extensions": [
      "asf",
      "asx"
    ]
  },
  "video/x-ms-vob": {
    "source": "apache",
    "extensions": [
      "vob"
    ]
  },
  "video/x-ms-wm": {
    "source": "apache",
    "extensions": [
      "wm"
    ]
  },
  "video/x-ms-wmv": {
    "source": "apache",
    "compressible": false,
    "extensions": [
      "wmv"
    ]
  },
  "video/x-ms-wmx": {
    "source": "apache",
    "extensions": [
      "wmx"
    ]
  },
  "video/x-ms-wvx": {
    "source": "apache",
    "extensions": [
      "wvx"
    ]
  },
  "video/x-msvideo": {
    "source": "apache",
    "extensions": [
      "avi"
    ]
  },
  "video/x-sgi-movie": {
    "source": "apache",
    "extensions": [
      "movie"
    ]
  },
  "video/x-smv": {
    "source": "apache",
    "extensions": [
      "smv"
    ]
  },
  "x-conference/x-cooltalk": {
    "source": "apache",
    "extensions": [
      "ice"
    ]
  },
  "x-shader/x-fragment": {
    "compressible": true
  },
  "x-shader/x-vertex": {
    "compressible": true
  }
};

// deno:https://jsr.io/@std/media-types/1.1.0/_db.ts
var types = /* @__PURE__ */ new Map();
var extensions = /* @__PURE__ */ new Map();
var preference = [
  "nginx",
  "apache",
  void 0,
  "iana"
];
for (const type of Object.keys(db_default)) {
  const mime = db_default[type];
  const exts = mime.extensions;
  if (!exts || !exts.length) {
    continue;
  }
  extensions.set(type, exts);
  for (const ext of exts) {
    const current = types.get(ext);
    if (current) {
      const from = preference.indexOf(db_default[current].source);
      const to = preference.indexOf(mime.source);
      if (current !== "application/octet-stream" && current !== "application/mp4" && (from > to || // @ts-ignore work around https://github.com/denoland/dnt/issues/148
      from === to && current.startsWith("application/"))) {
        continue;
      }
    }
    types.set(ext, type);
  }
}

// deno:https://jsr.io/@std/media-types/1.1.0/get_charset.ts
function getCharset(type) {
  try {
    const [mediaType, params] = parseMediaType(type);
    if (params?.charset) {
      return params.charset;
    }
    const entry = db_default[mediaType];
    if (entry?.charset) {
      return entry.charset;
    }
    if (mediaType.startsWith("text/")) {
      return "UTF-8";
    }
  } catch {
  }
  return void 0;
}

// deno:https://jsr.io/@std/media-types/1.1.0/format_media_type.ts
function formatMediaType(type, param) {
  let serializedMediaType = "";
  const [major = "", sub] = type.split("/");
  if (!sub) {
    if (!isToken(type)) {
      return "";
    }
    serializedMediaType += type.toLowerCase();
  } else {
    if (!isToken(major) || !isToken(sub)) {
      return "";
    }
    serializedMediaType += `${major.toLowerCase()}/${sub.toLowerCase()}`;
  }
  if (param) {
    param = isIterator(param) ? Object.fromEntries(param) : param;
    const attrs = Object.keys(param);
    attrs.sort();
    for (const attribute of attrs) {
      if (!isToken(attribute)) {
        return "";
      }
      const value = param[attribute];
      serializedMediaType += `; ${attribute.toLowerCase()}`;
      const needEnc = needsEncoding(value);
      if (needEnc) {
        serializedMediaType += "*";
      }
      serializedMediaType += "=";
      if (needEnc) {
        serializedMediaType += `utf-8''${encodeURIComponent(value)}`;
        continue;
      }
      if (isToken(value)) {
        serializedMediaType += value;
        continue;
      }
      serializedMediaType += `"${value.replace(/["\\]/gi, (m) => `\\${m}`)}"`;
    }
  }
  return serializedMediaType;
}

// deno:https://jsr.io/@std/media-types/1.1.0/type_by_extension.ts
function typeByExtension(extension) {
  extension = extension.startsWith(".") ? extension.slice(1) : extension;
  return types.get(extension.toLowerCase());
}

// deno:https://jsr.io/@std/media-types/1.1.0/content_type.ts
function contentType(extensionOrType) {
  try {
    const [mediaType, params = {}] = extensionOrType.includes("/") ? parseMediaType(extensionOrType) : [
      typeByExtension(extensionOrType),
      void 0
    ];
    if (!mediaType) {
      return void 0;
    }
    if (!("charset" in params)) {
      const charset = getCharset(mediaType);
      if (charset) {
        params.charset = charset;
      }
    }
    return formatMediaType(mediaType, params);
  } catch {
  }
  return void 0;
}

// deno:https://jsr.io/@std/encoding/1.0.11/_common64.ts
var padding = "=".charCodeAt(0);
var alphabet = {
  base64: new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),
  base64url: new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
};
var rAlphabet = {
  base64: new Uint8Array(128).fill(64),
  base64url: new Uint8Array(128).fill(64)
};
alphabet.base64.forEach((byte, i) => rAlphabet.base64[byte] = i);
alphabet.base64url.forEach((byte, i) => rAlphabet.base64url[byte] = i);
function calcSizeBase64(originalSize) {
  return ((originalSize + 2) / 3 | 0) * 4;
}
function encode(buffer, i, o, alphabet3, padding3) {
  i += 2;
  for (; i < buffer.length; i += 3) {
    const x = buffer[i - 2] << 16 | buffer[i - 1] << 8 | buffer[i];
    buffer[o++] = alphabet3[x >> 18];
    buffer[o++] = alphabet3[x >> 12 & 63];
    buffer[o++] = alphabet3[x >> 6 & 63];
    buffer[o++] = alphabet3[x & 63];
  }
  switch (i) {
    case buffer.length + 1: {
      const x = buffer[i - 2] << 16;
      buffer[o++] = alphabet3[x >> 18];
      buffer[o++] = alphabet3[x >> 12 & 63];
      buffer[o++] = padding3;
      buffer[o++] = padding3;
      break;
    }
    case buffer.length: {
      const x = buffer[i - 2] << 16 | buffer[i - 1] << 8;
      buffer[o++] = alphabet3[x >> 18];
      buffer[o++] = alphabet3[x >> 12 & 63];
      buffer[o++] = alphabet3[x >> 6 & 63];
      buffer[o++] = padding3;
      break;
    }
  }
  return o;
}

// deno:https://jsr.io/@std/encoding/1.0.11/_common_detach.ts
function detach(buffer, maxSize) {
  const originalSize = buffer.length;
  if (buffer.byteOffset) {
    const b = new Uint8Array(buffer.buffer);
    b.set(buffer);
    buffer = b.subarray(0, originalSize);
  }
  buffer = new Uint8Array(buffer.buffer.transfer(maxSize));
  buffer.set(buffer.subarray(0, originalSize), maxSize - originalSize);
  return [
    buffer,
    maxSize - originalSize
  ];
}

// deno:https://jsr.io/@std/encoding/1.0.11/base64.ts
var padding2 = "=".charCodeAt(0);
var alphabet2 = new TextEncoder().encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
var rAlphabet2 = new Uint8Array(128).fill(64);
alphabet2.forEach((byte, i) => rAlphabet2[byte] = i);
function encodeBase64(data) {
  if (typeof data === "string") {
    data = new TextEncoder().encode(data);
  } else if (data instanceof ArrayBuffer) data = new Uint8Array(data).slice();
  else data = data.slice();
  const [output, i] = detach(data, calcSizeBase64(data.length));
  encode(output, i, 0, alphabet2, padding2);
  return new TextDecoder().decode(output);
}

// deno:https://jsr.io/@std/http/1.1.3/etag.ts
var encoder = new TextEncoder();
var DEFAULT_ALGORITHM = "SHA-256";
function isFileInfo(value) {
  return Boolean(value && typeof value === "object" && "mtime" in value && "size" in value);
}
async function calcEntity(entity, { algorithm = DEFAULT_ALGORITHM }) {
  if (entity.length === 0) {
    return `0-47DEQpj8HBSa+/TImW+5JCeuQeR`;
  }
  if (typeof entity === "string") {
    entity = encoder.encode(entity);
  }
  const hash = encodeBase64(await crypto.subtle.digest(algorithm, entity)).substring(0, 27);
  return `${entity.length.toString(16)}-${hash}`;
}
async function calcFileInfo(fileInfo, { algorithm = DEFAULT_ALGORITHM }) {
  if (fileInfo.mtime) {
    const hash = encodeBase64(await crypto.subtle.digest(algorithm, encoder.encode(fileInfo.mtime.toJSON()))).substring(0, 27);
    return `${fileInfo.size.toString(16)}-${hash}`;
  }
}
async function eTag(entity, options = {}) {
  const weak = options.weak ?? isFileInfo(entity);
  const tag = await (isFileInfo(entity) ? calcFileInfo(entity, options) : calcEntity(entity, options));
  if (!tag) {
    return void 0;
  }
  return weak ? `W/"${tag}"` : `"${tag}"`;
}
var STAR_REGEXP = /^\s*\*\s*$/;
var COMMA_REGEXP = /\s*,\s*/;
function ifNoneMatch(value, etag) {
  if (!value || !etag) {
    return true;
  }
  if (STAR_REGEXP.test(value)) {
    return false;
  }
  etag = etag.startsWith("W/") ? etag.slice(2) : etag;
  const tags = value.split(COMMA_REGEXP).map((tag) => tag.startsWith("W/") ? tag.slice(2) : tag);
  return !tags.includes(etag);
}

// deno:https://jsr.io/@std/http/1.1.3/status.ts
var STATUS_CODE = {
  /** RFC 7231, 6.2.1 */
  Continue: 100,
  /** RFC 7231, 6.2.2 */
  SwitchingProtocols: 101,
  /** RFC 2518, 10.1 */
  Processing: 102,
  /** RFC 8297 **/
  EarlyHints: 103,
  /** RFC 7231, 6.3.1 */
  OK: 200,
  /** RFC 7231, 6.3.2 */
  Created: 201,
  /** RFC 7231, 6.3.3 */
  Accepted: 202,
  /** RFC 7231, 6.3.4 */
  NonAuthoritativeInfo: 203,
  /** RFC 7231, 6.3.5 */
  NoContent: 204,
  /** RFC 7231, 6.3.6 */
  ResetContent: 205,
  /** RFC 7233, 4.1 */
  PartialContent: 206,
  /** RFC 4918, 11.1 */
  MultiStatus: 207,
  /** RFC 5842, 7.1 */
  AlreadyReported: 208,
  /** RFC 3229, 10.4.1 */
  IMUsed: 226,
  /** RFC 7231, 6.4.1 */
  MultipleChoices: 300,
  /** RFC 7231, 6.4.2 */
  MovedPermanently: 301,
  /** RFC 7231, 6.4.3 */
  Found: 302,
  /** RFC 7231, 6.4.4 */
  SeeOther: 303,
  /** RFC 7232, 4.1 */
  NotModified: 304,
  /** RFC 7231, 6.4.5 */
  UseProxy: 305,
  /** RFC 7231, 6.4.7 */
  TemporaryRedirect: 307,
  /** RFC 7538, 3 */
  PermanentRedirect: 308,
  /** RFC 7231, 6.5.1 */
  BadRequest: 400,
  /** RFC 7235, 3.1 */
  Unauthorized: 401,
  /** RFC 7231, 6.5.2 */
  PaymentRequired: 402,
  /** RFC 7231, 6.5.3 */
  Forbidden: 403,
  /** RFC 7231, 6.5.4 */
  NotFound: 404,
  /** RFC 7231, 6.5.5 */
  MethodNotAllowed: 405,
  /** RFC 7231, 6.5.6 */
  NotAcceptable: 406,
  /** RFC 7235, 3.2 */
  ProxyAuthRequired: 407,
  /** RFC 7231, 6.5.7 */
  RequestTimeout: 408,
  /** RFC 7231, 6.5.8 */
  Conflict: 409,
  /** RFC 7231, 6.5.9 */
  Gone: 410,
  /** RFC 7231, 6.5.10 */
  LengthRequired: 411,
  /** RFC 7232, 4.2 */
  PreconditionFailed: 412,
  /** RFC 7231, 6.5.11 */
  ContentTooLarge: 413,
  /** RFC 7231, 6.5.12 */
  URITooLong: 414,
  /** RFC 7231, 6.5.13 */
  UnsupportedMediaType: 415,
  /** RFC 7233, 4.4 */
  RangeNotSatisfiable: 416,
  /** RFC 7231, 6.5.14 */
  ExpectationFailed: 417,
  /** RFC 7168, 2.3.3 */
  Teapot: 418,
  /** RFC 7540, 9.1.2 */
  MisdirectedRequest: 421,
  /** RFC 4918, 11.2 */
  UnprocessableEntity: 422,
  /** RFC 4918, 11.3 */
  Locked: 423,
  /** RFC 4918, 11.4 */
  FailedDependency: 424,
  /** RFC 8470, 5.2 */
  TooEarly: 425,
  /** RFC 7231, 6.5.15 */
  UpgradeRequired: 426,
  /** RFC 6585, 3 */
  PreconditionRequired: 428,
  /** RFC 6585, 4 */
  TooManyRequests: 429,
  /** RFC 6585, 5 */
  RequestHeaderFieldsTooLarge: 431,
  /** RFC 7725, 3 */
  UnavailableForLegalReasons: 451,
  /** RFC 7231, 6.6.1 */
  InternalServerError: 500,
  /** RFC 7231, 6.6.2 */
  NotImplemented: 501,
  /** RFC 7231, 6.6.3 */
  BadGateway: 502,
  /** RFC 7231, 6.6.4 */
  ServiceUnavailable: 503,
  /** RFC 7231, 6.6.5 */
  GatewayTimeout: 504,
  /** RFC 7231, 6.6.6 */
  HTTPVersionNotSupported: 505,
  /** RFC 2295, 8.1 */
  VariantAlsoNegotiates: 506,
  /** RFC 4918, 11.5 */
  InsufficientStorage: 507,
  /** RFC 5842, 7.2 */
  LoopDetected: 508,
  /** RFC 2774, 7 */
  NotExtended: 510,
  /** RFC 6585, 6 */
  NetworkAuthenticationRequired: 511
};
var STATUS_TEXT = {
  [STATUS_CODE.Accepted]: "Accepted",
  [STATUS_CODE.AlreadyReported]: "Already Reported",
  [STATUS_CODE.BadGateway]: "Bad Gateway",
  [STATUS_CODE.BadRequest]: "Bad Request",
  [STATUS_CODE.Conflict]: "Conflict",
  [STATUS_CODE.Continue]: "Continue",
  [STATUS_CODE.Created]: "Created",
  [STATUS_CODE.EarlyHints]: "Early Hints",
  [STATUS_CODE.ExpectationFailed]: "Expectation Failed",
  [STATUS_CODE.FailedDependency]: "Failed Dependency",
  [STATUS_CODE.Forbidden]: "Forbidden",
  [STATUS_CODE.Found]: "Found",
  [STATUS_CODE.GatewayTimeout]: "Gateway Timeout",
  [STATUS_CODE.Gone]: "Gone",
  [STATUS_CODE.HTTPVersionNotSupported]: "HTTP Version Not Supported",
  [STATUS_CODE.IMUsed]: "IM Used",
  [STATUS_CODE.InsufficientStorage]: "Insufficient Storage",
  [STATUS_CODE.InternalServerError]: "Internal Server Error",
  [STATUS_CODE.LengthRequired]: "Length Required",
  [STATUS_CODE.Locked]: "Locked",
  [STATUS_CODE.LoopDetected]: "Loop Detected",
  [STATUS_CODE.MethodNotAllowed]: "Method Not Allowed",
  [STATUS_CODE.MisdirectedRequest]: "Misdirected Request",
  [STATUS_CODE.MovedPermanently]: "Moved Permanently",
  [STATUS_CODE.MultiStatus]: "Multi Status",
  [STATUS_CODE.MultipleChoices]: "Multiple Choices",
  [STATUS_CODE.NetworkAuthenticationRequired]: "Network Authentication Required",
  [STATUS_CODE.NoContent]: "No Content",
  [STATUS_CODE.NonAuthoritativeInfo]: "Non Authoritative Info",
  [STATUS_CODE.NotAcceptable]: "Not Acceptable",
  [STATUS_CODE.NotExtended]: "Not Extended",
  [STATUS_CODE.NotFound]: "Not Found",
  [STATUS_CODE.NotImplemented]: "Not Implemented",
  [STATUS_CODE.NotModified]: "Not Modified",
  [STATUS_CODE.OK]: "OK",
  [STATUS_CODE.PartialContent]: "Partial Content",
  [STATUS_CODE.PaymentRequired]: "Payment Required",
  [STATUS_CODE.PermanentRedirect]: "Permanent Redirect",
  [STATUS_CODE.PreconditionFailed]: "Precondition Failed",
  [STATUS_CODE.PreconditionRequired]: "Precondition Required",
  [STATUS_CODE.Processing]: "Processing",
  [STATUS_CODE.ProxyAuthRequired]: "Proxy Auth Required",
  [STATUS_CODE.ContentTooLarge]: "Content Too Large",
  [STATUS_CODE.RequestHeaderFieldsTooLarge]: "Request Header Fields Too Large",
  [STATUS_CODE.RequestTimeout]: "Request Timeout",
  [STATUS_CODE.URITooLong]: "URI Too Long",
  [STATUS_CODE.RangeNotSatisfiable]: "Range Not Satisfiable",
  [STATUS_CODE.ResetContent]: "Reset Content",
  [STATUS_CODE.SeeOther]: "See Other",
  [STATUS_CODE.ServiceUnavailable]: "Service Unavailable",
  [STATUS_CODE.SwitchingProtocols]: "Switching Protocols",
  [STATUS_CODE.Teapot]: "I'm a teapot",
  [STATUS_CODE.TemporaryRedirect]: "Temporary Redirect",
  [STATUS_CODE.TooEarly]: "Too Early",
  [STATUS_CODE.TooManyRequests]: "Too Many Requests",
  [STATUS_CODE.Unauthorized]: "Unauthorized",
  [STATUS_CODE.UnavailableForLegalReasons]: "Unavailable For Legal Reasons",
  [STATUS_CODE.UnprocessableEntity]: "Unprocessable Entity",
  [STATUS_CODE.UnsupportedMediaType]: "Unsupported Media Type",
  [STATUS_CODE.UpgradeRequired]: "Upgrade Required",
  [STATUS_CODE.UseProxy]: "Use Proxy",
  [STATUS_CODE.VariantAlsoNegotiates]: "Variant Also Negotiates"
};
function isStatus(status) {
  return Object.values(STATUS_CODE).includes(status);
}
function isRedirectStatus(status) {
  return isStatus(status) && status >= 300 && status < 400;
}

// deno:https://jsr.io/@std/streams/1.1.2/byte_slice_stream.ts
var ByteSliceStream = class extends TransformStream {
  #offsetStart = 0;
  #offsetEnd = 0;
  /**
   * Constructs a new instance.
   *
   * @param start The zero-indexed byte index to start reading from.
   * @param end The zero-indexed byte index to stop reading at. Inclusive.
   */
  constructor(start = 0, end = Infinity) {
    super({
      start: () => {
        if (start < 0) {
          throw new RangeError(`Cannot construct ByteSliceStream as start must be >= 0: received ${start}`);
        }
        end += 1;
      },
      transform: (chunk, controller) => {
        this.#offsetStart = this.#offsetEnd;
        this.#offsetEnd += chunk.byteLength;
        if (this.#offsetEnd > start) {
          if (this.#offsetStart < start) {
            chunk = chunk.slice(start - this.#offsetStart);
          }
          if (this.#offsetEnd >= end) {
            chunk = chunk.slice(0, chunk.byteLength - this.#offsetEnd + end);
            controller.enqueue(chunk);
            controller.terminate();
          } else {
            controller.enqueue(chunk);
          }
        }
      }
    });
  }
};

// deno:https://jsr.io/@std/cli/1.0.32/parse_args.ts
var FLAG_REGEXP = /^(?:-(?:(?<doubleDash>-)(?<negated>no-)?)?)(?<key>.+?)(?:=(?<value>.*))?$/s;
var LETTER_REGEXP = /[A-Za-z]/;
var NUMBER_REGEXP = /-?\d+(\.\d*)?(e-?\d+)?$/;
var HYPHEN_REGEXP = /^(-|--)[^-]/;
var VALUE_REGEXP = /=(?<value>.+)/;
var FLAG_NAME_REGEXP = /^--[^=]+$/;
var SPECIAL_CHAR_REGEXP = /\W/;
var NON_WHITESPACE_REGEXP = /\S/;
function isNumber(string) {
  return NON_WHITESPACE_REGEXP.test(string) && Number.isFinite(Number(string));
}
function isConstructorOrProto(obj, key) {
  return key === "constructor" && typeof obj[key] === "function" || key === "__proto__";
}
function setNested(object, keys, value, collect = false) {
  keys = [
    ...keys
  ];
  const key = keys.pop();
  for (const k of keys) {
    if (isConstructorOrProto(object, k)) return;
    object = object[k] ??= {};
  }
  if (isConstructorOrProto(object, key)) return;
  if (collect) {
    const v = object[key];
    if (Array.isArray(v)) {
      v.push(value);
      return;
    }
    value = v ? [
      v,
      value
    ] : [
      value
    ];
  }
  object[key] = value;
}
function hasNested(object, keys) {
  for (const key of keys) {
    const value = object[key];
    if (!Object.hasOwn(object, key)) return false;
    object = value;
  }
  return true;
}
function aliasIsBoolean(aliasMap, booleanSet, key) {
  const set = aliasMap.get(key);
  if (set === void 0) return false;
  for (const alias of set) if (booleanSet.has(alias)) return true;
  return false;
}
function isBooleanString(value) {
  return value === "true" || value === "false";
}
function parseBooleanString(value) {
  return value !== "false";
}
function parseArgs(args, options) {
  const { "--": doubleDash = false, alias = {}, boolean = false, default: defaults = {}, stopEarly = false, string = [], collect = [], negatable = [], unknown: unknownFn = (i) => i } = options ?? {};
  const aliasMap = /* @__PURE__ */ new Map();
  const booleanSet = /* @__PURE__ */ new Set();
  const stringSet = /* @__PURE__ */ new Set();
  const collectSet = /* @__PURE__ */ new Set();
  const negatableSet = /* @__PURE__ */ new Set();
  let allBools = false;
  if (alias) {
    for (const [key, value] of Object.entries(alias)) {
      if (value === void 0) {
        throw new TypeError("Alias value must be defined");
      }
      const aliases = Array.isArray(value) ? value : [
        value
      ];
      aliasMap.set(key, new Set(aliases));
      aliases.forEach((alias2) => aliasMap.set(alias2, /* @__PURE__ */ new Set([
        key,
        ...aliases.filter((it) => it !== alias2)
      ])));
    }
  }
  if (boolean) {
    if (typeof boolean === "boolean") {
      allBools = boolean;
    } else {
      const booleanArgs = Array.isArray(boolean) ? boolean : [
        boolean
      ];
      for (const key of booleanArgs.filter(Boolean)) {
        booleanSet.add(key);
        aliasMap.get(key)?.forEach((al) => {
          booleanSet.add(al);
        });
      }
    }
  }
  if (string) {
    const stringArgs = Array.isArray(string) ? string : [
      string
    ];
    for (const key of stringArgs.filter(Boolean)) {
      stringSet.add(key);
      aliasMap.get(key)?.forEach((al) => stringSet.add(al));
    }
  }
  if (collect) {
    const collectArgs = Array.isArray(collect) ? collect : [
      collect
    ];
    for (const key of collectArgs.filter(Boolean)) {
      collectSet.add(key);
      aliasMap.get(key)?.forEach((al) => collectSet.add(al));
    }
  }
  if (negatable) {
    const negatableArgs = Array.isArray(negatable) ? negatable : [
      negatable
    ];
    for (const key of negatableArgs.filter(Boolean)) {
      negatableSet.add(key);
      aliasMap.get(key)?.forEach((alias2) => negatableSet.add(alias2));
    }
  }
  const argv = {
    _: []
  };
  function setArgument(key, value, arg, collect2) {
    if (!booleanSet.has(key) && !stringSet.has(key) && !aliasMap.has(key) && !collectSet.has(key) && !(allBools && FLAG_NAME_REGEXP.test(arg)) && unknownFn?.(arg, key, value) === false) {
      return;
    }
    if (typeof value === "string" && !stringSet.has(key)) {
      value = isNumber(value) ? Number(value) : value;
    }
    const collectable = collect2 && collectSet.has(key);
    setNested(argv, key.split("."), value, collectable);
    aliasMap.get(key)?.forEach((key2) => {
      setNested(argv, key2.split("."), value, collectable);
    });
  }
  let notFlags = [];
  const index = args.indexOf("--");
  if (index !== -1) {
    notFlags = args.slice(index + 1);
    args = args.slice(0, index);
  }
  argsLoop: for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const groups = arg.match(FLAG_REGEXP)?.groups;
    if (groups) {
      const { doubleDash: doubleDash2, negated } = groups;
      let key = groups.key;
      let value = groups.value;
      if (doubleDash2) {
        if (value != null) {
          if (booleanSet.has(key)) value = parseBooleanString(value);
          setArgument(key, value, arg, true);
          continue;
        }
        if (negated) {
          if (negatableSet.has(key)) {
            setArgument(key, false, arg, false);
            continue;
          }
          key = `no-${key}`;
        }
        const next = args[i + 1];
        if (next) {
          if (!booleanSet.has(key) && !allBools && !next.startsWith("-") && (!aliasMap.has(key) || !aliasIsBoolean(aliasMap, booleanSet, key))) {
            value = next;
            i++;
            setArgument(key, value, arg, true);
            continue;
          }
          if (isBooleanString(next)) {
            value = parseBooleanString(next);
            i++;
            setArgument(key, value, arg, true);
            continue;
          }
        }
        value = stringSet.has(key) ? "" : true;
        setArgument(key, value, arg, true);
        continue;
      }
      const letters = arg.slice(1, -1).split("");
      for (const [j, letter] of letters.entries()) {
        const next = arg.slice(j + 2);
        if (next === "-") {
          setArgument(letter, next, arg, true);
          continue;
        }
        if (next === "=") {
          setArgument(letter, "", arg, true);
          continue argsLoop;
        }
        if (LETTER_REGEXP.test(letter)) {
          const groups2 = VALUE_REGEXP.exec(next)?.groups;
          if (groups2) {
            setArgument(letter, groups2.value, arg, true);
            continue argsLoop;
          }
          if (NUMBER_REGEXP.test(next)) {
            setArgument(letter, next, arg, true);
            continue argsLoop;
          }
        }
        if (letters[j + 1]?.match(SPECIAL_CHAR_REGEXP)) {
          setArgument(letter, arg.slice(j + 2), arg, true);
          continue argsLoop;
        }
        setArgument(letter, stringSet.has(letter) ? "" : true, arg, true);
      }
      key = arg.slice(-1);
      if (key === "-") continue;
      const nextArg = args[i + 1];
      if (nextArg) {
        if (!HYPHEN_REGEXP.test(nextArg) && !booleanSet.has(key) && (!aliasMap.has(key) || !aliasIsBoolean(aliasMap, booleanSet, key))) {
          setArgument(key, nextArg, arg, true);
          i++;
          continue;
        }
        if (isBooleanString(nextArg)) {
          const value2 = parseBooleanString(nextArg);
          setArgument(key, value2, arg, true);
          i++;
          continue;
        }
      }
      setArgument(key, stringSet.has(key) ? "" : true, arg, true);
      continue;
    }
    if (unknownFn?.(arg) !== false) {
      argv._.push(stringSet.has("_") || !isNumber(arg) ? arg : Number(arg));
    }
    if (stopEarly) {
      argv._.push(...args.slice(i + 1));
      break;
    }
  }
  for (const [key, value] of Object.entries(defaults)) {
    const keys = key.split(".");
    if (!hasNested(argv, keys)) {
      setNested(argv, keys, value);
      aliasMap.get(key)?.forEach((key2) => setNested(argv, key2.split("."), value));
    }
  }
  for (const key of booleanSet.keys()) {
    const keys = key.split(".");
    if (!hasNested(argv, keys)) {
      const value = collectSet.has(key) ? [] : false;
      setNested(argv, keys, value);
    }
  }
  for (const key of stringSet.keys()) {
    const keys = key.split(".");
    if (!hasNested(argv, keys) && collectSet.has(key)) {
      setNested(argv, keys, []);
    }
  }
  if (doubleDash) {
    argv["--"] = notFlags;
  } else {
    argv._.push(...notFlags);
  }
  return argv;
}

// deno:https://jsr.io/@std/http/1.1.3/deno.json
var deno_default = {
  name: "@std/http",
  version: "1.1.3",
  exports: {
    ".": "./mod.ts",
    "./cookie": "./cookie.ts",
    "./etag": "./etag.ts",
    "./file-server": "./file_server.ts",
    "./unstable-file-server": "./unstable_file_server.ts",
    "./unstable-formdata-decoder-stream": "./unstable_formdata_decoder_stream.ts",
    "./unstable-formdata-encoder-stream": "./unstable_formdata_encoder_stream.ts",
    "./unstable-header": "./unstable_header.ts",
    "./unstable-method": "./unstable_method.ts",
    "./unstable-problem-details": "./unstable_problem_details.ts",
    "./negotiation": "./negotiation.ts",
    "./server-sent-event-stream": "./server_sent_event_stream.ts",
    "./server-sent-event-parse-stream": "./server_sent_event_parse_stream.ts",
    "./status": "./status.ts",
    "./unstable-signed-cookie": "./unstable_signed_cookie.ts",
    "./unstable-structured-fields": "./unstable_structured_fields.ts",
    "./user-agent": "./user_agent.ts",
    "./unstable-route": "./unstable_route.ts",
    "./unstable-cache-control": "./unstable_cache_control.ts",
    "./unstable-message-signatures": "./unstable_message_signatures.ts",
    "./unstable-error": "./unstable_error.ts"
  }
};

// deno:https://jsr.io/@std/fmt/1.0.10/bytes.ts
function format(num, options = {}) {
  if (!Number.isFinite(num)) {
    throw new TypeError(`Expected a finite number, got ${typeof num}: ${num}`);
  }
  const UNITS_FIRSTLETTER = (options.bits ? "b" : "B") + "kMGTPEZY";
  if (options.signed && num === 0) {
    return ` 0 ${UNITS_FIRSTLETTER[0]}`;
  }
  const prefix = num < 0 ? "-" : options.signed ? "+" : "";
  num = Math.abs(num);
  const localeOptions = getLocaleOptions(options);
  if (num < 1) {
    const numberString2 = toLocaleString(num, options.locale, localeOptions);
    return prefix + numberString2 + " " + UNITS_FIRSTLETTER[0];
  }
  const exponent = Math.min(Math.floor(options.binary ? Math.log(num) / Math.log(1024) : Math.log10(num) / 3), UNITS_FIRSTLETTER.length - 1);
  num /= Math.pow(options.binary ? 1024 : 1e3, exponent);
  if (!localeOptions) {
    num = Number(num.toPrecision(3));
  }
  const numberString = toLocaleString(num, options.locale, localeOptions);
  let unit = UNITS_FIRSTLETTER[exponent];
  if (exponent > 0) {
    unit += options.binary ? "i" : "";
    unit += options.bits ? "bit" : "B";
  }
  return prefix + numberString + " " + unit;
}
function getLocaleOptions({ maximumFractionDigits, minimumFractionDigits }) {
  if (maximumFractionDigits === void 0 && minimumFractionDigits === void 0) {
    return;
  }
  const ret = {};
  if (maximumFractionDigits !== void 0) {
    ret.maximumFractionDigits = maximumFractionDigits;
  }
  if (minimumFractionDigits !== void 0) {
    ret.minimumFractionDigits = minimumFractionDigits;
  }
  return ret;
}
function toLocaleString(num, locale, options) {
  if (typeof locale === "string" || Array.isArray(locale)) {
    return num.toLocaleString(locale, options);
  } else if (locale === true || options !== void 0) {
    return num.toLocaleString(void 0, options);
  }
  return num.toString();
}

// deno:https://jsr.io/@std/net/1.0.6/unstable_get_network_address.ts
function getNetworkAddress(family = "IPv4") {
  return Deno.networkInterfaces().find((i) => i.family === family && i.mac !== "00:00:00:00:00:00" && (family === "IPv4" ? !i.address.startsWith("127") : !(i.address === "::1" || i.address === "fe80::1") && i.scopeid === 0))?.address;
}

// deno:https://jsr.io/@std/html/1.0.7/entities.ts
var rawToEntityEntries = [
  [
    "&",
    "&amp;"
  ],
  [
    "<",
    "&lt;"
  ],
  [
    ">",
    "&gt;"
  ],
  [
    '"',
    "&quot;"
  ],
  [
    "'",
    "&#39;"
  ]
];
var defaultEntityList = Object.fromEntries([
  ...rawToEntityEntries.map(([raw, entity]) => [
    entity,
    raw
  ]),
  [
    "&apos;",
    "'"
  ],
  [
    "&nbsp;",
    "\xA0"
  ]
]);
var rawToEntity = new Map(rawToEntityEntries);
var rawRe = new RegExp(`[${[
  ...rawToEntity.keys()
].join("")}]`, "g");
function escape(str) {
  return str.replaceAll(rawRe, (m) => rawToEntity.get(m));
}

// deno:https://jsr.io/@std/http/1.1.3/unstable_header.ts
var HEADER = {
  /**
   * HTTP Header A-IM
   *
   * @see {@link https://www.iana.org/go/rfc3229 | RFC 3229: Delta encoding in HTTP}
   */
  AIm: "A-IM",
  /**
   * HTTP Header Accept
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 12.5.1: HTTP Semantics}
   */
  Accept: "Accept",
  /**
   * HTTP Header Accept-Additions
   *
   * @see {@link https://www.iana.org/go/rfc2324 | RFC 2324: Hyper Text Coffee Pot Control Protocol (HTCPCP/1.0)}
   */
  AcceptAdditions: "Accept-Additions",
  /**
   * HTTP Header Accept-CH
   *
   * @see {@link https://www.iana.org/go/rfc8942 | RFC 8942, Section 3.1: HTTP Client Hints}
   */
  AcceptCh: "Accept-CH",
  /**
   * HTTP Header Accept-Datetime
   *
   * @see {@link https://www.iana.org/go/rfc7089 | RFC 7089: HTTP Framework for Time-Based Access to Resource States -- Memento}
   */
  AcceptDatetime: "Accept-Datetime",
  /**
   * HTTP Header Accept-Encoding
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 12.5.3: HTTP Semantics}
   */
  AcceptEncoding: "Accept-Encoding",
  /**
   * HTTP Header Accept-Features
   *
   * @see {@link https://www.iana.org/go/rfc2295 | RFC 2295: Transparent Content Negotiation in HTTP}
   */
  AcceptFeatures: "Accept-Features",
  /**
   * HTTP Header Accept-Language
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 12.5.4: HTTP Semantics}
   */
  AcceptLanguage: "Accept-Language",
  /**
   * HTTP Header Accept-Patch
   *
   * @see {@link https://www.iana.org/go/rfc5789 | RFC 5789: PATCH Method for HTTP}
   */
  AcceptPatch: "Accept-Patch",
  /**
   * HTTP Header Accept-Post
   *
   * @see {@link https://www.w3.org/TR/ldp | Linked Data Platform 1.0}
   */
  AcceptPost: "Accept-Post",
  /**
   * HTTP Header Accept-Ranges
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 14.3: HTTP Semantics}
   */
  AcceptRanges: "Accept-Ranges",
  /**
   * HTTP Header Accept-Signature
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-message-signatures-19 | RFC-ietf-httpbis-message-signatures-19, Section 5.1: HTTP Message Signatures}
   */
  AcceptSignature: "Accept-Signature",
  /**
   * HTTP Header Access-Control-Allow-Credentials
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-allow-credentials | Fetch}
   */
  AccessControlAllowCredentials: "Access-Control-Allow-Credentials",
  /**
   * HTTP Header Access-Control-Allow-Headers
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-allow-headers | Fetch}
   */
  AccessControlAllowHeaders: "Access-Control-Allow-Headers",
  /**
   * HTTP Header Access-Control-Allow-Methods
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-allow-methods | Fetch}
   */
  AccessControlAllowMethods: "Access-Control-Allow-Methods",
  /**
   * HTTP Header Access-Control-Allow-Origin
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-allow-origin | Fetch}
   */
  AccessControlAllowOrigin: "Access-Control-Allow-Origin",
  /**
   * HTTP Header Access-Control-Expose-Headers
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-expose-headers | Fetch}
   */
  AccessControlExposeHeaders: "Access-Control-Expose-Headers",
  /**
   * HTTP Header Access-Control-Max-Age
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-max-age | Fetch}
   */
  AccessControlMaxAge: "Access-Control-Max-Age",
  /**
   * HTTP Header Access-Control-Request-Headers
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-request-headers | Fetch}
   */
  AccessControlRequestHeaders: "Access-Control-Request-Headers",
  /**
   * HTTP Header Access-Control-Request-Method
   *
   * @see {@link https://fetch.spec.whatwg.org/#http-access-control-request-method | Fetch}
   */
  AccessControlRequestMethod: "Access-Control-Request-Method",
  /**
   * HTTP Header Age
   *
   * @see {@link https://www.iana.org/go/rfc9111 | RFC9111, Section 5.1: HTTP Caching}
   */
  Age: "Age",
  /**
   * HTTP Header Allow
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.2.1: HTTP Semantics}
   */
  Allow: "Allow",
  /**
   * HTTP Header ALPN
   *
   * @see {@link https://www.iana.org/go/rfc7639 | RFC 7639, Section 2: The ALPN HTTP Header Field}
   */
  ALPN: "ALPN",
  /**
   * HTTP Header Alt-Svc
   *
   * @see {@link https://www.iana.org/go/rfc7838 | RFC 7838: HTTP Alternative Services}
   */
  AltSvc: "Alt-Svc",
  /**
   * HTTP Header Alt-Used
   *
   * @see {@link https://www.iana.org/go/rfc7838 | RFC 7838: HTTP Alternative Services}
   */
  AltUsed: "Alt-Used",
  /**
   * HTTP Header Alternates
   *
   * @see {@link https://www.iana.org/go/rfc2295 | RFC 2295: Transparent Content Negotiation in HTTP}
   */
  Alternates: "Alternates",
  /**
   * HTTP Header Apply-To-Redirect-Ref
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC 4437: Web Distributed Authoring and Versioning (WebDAV) Redirect Reference Resources}
   */
  ApplyToRedirectRef: "Apply-To-Redirect-Ref",
  /**
   * HTTP Header Authentication-Control
   *
   * @see {@link https://www.iana.org/go/rfc8053 | RFC 8053, Section 4: HTTP Authentication Extensions for Interactive Clients}
   */
  AuthenticationControl: "Authentication-Control",
  /**
   * HTTP Header Authentication-Info
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.6.3: HTTP Semantics}
   */
  AuthenticationInfo: "Authentication-Info",
  /**
   * HTTP Header Authorization
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.6.2: HTTP Semantics}
   */
  Authorization: "Authorization",
  /**
   * HTTP Header Cache-Control
   *
   * @see {@link https://www.iana.org/go/rfc9111 | RFC9111, Section 5.2}
   */
  CacheControl: "Cache-Control",
  /**
   * HTTP Header Cache-Status
   *
   * @see {@link https://www.iana.org/go/rfc9211 | RFC9211: The Cache-Status HTTP Response Header Field}
   */
  CacheStatus: "Cache-Status",
  /**
   * HTTP Header Cal-Managed-ID
   *
   * @see {@link https://www.iana.org/go/rfc8607 | RFC 8607, Section 5.1: Calendaring Extensions to WebDAV (CalDAV): Managed Attachments}
   */
  CalManagedId: "Cal-Managed-ID",
  /**
   * HTTP Header CalDAV-Timezones
   *
   * @see {@link https://www.iana.org/go/rfc7809 | RFC 7809, Section 7.1: Calendaring Extensions to WebDAV (CalDAV): Time Zones by Reference}
   */
  CaldavTimezones: "CalDAV-Timezones",
  /**
   * HTTP Header Capsule-Protocol
   *
   * @see {@link https://www.iana.org/go/rfc9297 | RFC9297}
   */
  CapsuleProtocol: "Capsule-Protocol",
  /**
   * HTTP Header CDN-Cache-Control
   *
   * @see {@link https://www.iana.org/go/rfc9213 | RFC9213: Targeted HTTP Cache Control}
   */
  CdnCacheControl: "CDN-Cache-Control",
  /**
   * HTTP Header CDN-Loop
   *
   * @see {@link https://www.iana.org/go/rfc8586 | RFC 8586: Loop Detection in Content Delivery Networks (CDNs)}
   */
  CdnLoop: "CDN-Loop",
  /**
   * HTTP Header Cert-Not-After
   *
   * @see {@link https://www.iana.org/go/rfc8739 | RFC 8739, Section 3.3: Support for Short-Term, Automatically Renewed (STAR) Certificates in the Automated Certificate Management Environment (ACME)}
   */
  CertNotAfter: "Cert-Not-After",
  /**
   * HTTP Header Cert-Not-Before
   *
   * @see {@link https://www.iana.org/go/rfc8739 | RFC 8739, Section 3.3: Support for Short-Term, Automatically Renewed (STAR) Certificates in the Automated Certificate Management Environment (ACME)}
   */
  CertNotBefore: "Cert-Not-Before",
  /**
   * HTTP Header Clear-Site-Data
   *
   * @see {@link https://w3.org/TR/clear-site-data/#header | Clear Site Data}
   */
  ClearSiteData: "Clear-Site-Data",
  /**
   * HTTP Header Client-Cert
   *
   * @see {@link https://www.iana.org/go/rfc9440 | RFC9440, Section 2: Client-Cert HTTP Header Field}
   */
  ClientCert: "Client-Cert",
  /**
   * HTTP Header Client-Cert-Chain
   *
   * @see {@link https://www.iana.org/go/rfc9440 | RFC9440, Section 2: Client-Cert HTTP Header Field}
   */
  ClientCertChain: "Client-Cert-Chain",
  /**
   * HTTP Header Close
   *
   * @see {@link https://www.iana.org/go/rfc9112 | RFC9112, Section 9.6: HTTP/1.1}
   */
  Close: "Close",
  /**
   * HTTP Header Connection
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 7.6.1: HTTP Semantics}
   */
  Connection: "Connection",
  /**
   * HTTP Header Content-Digest
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-digest-headers-13 | RFC-ietf-httpbis-digest-headers-13, Section 2: Digest Fields}
   */
  ContentDigest: "Content-Digest",
  /**
  * HTTP Header Content-Disposition
  *
  * @see {@link https://www.iana.org/go/rfc6266 | RFC 6266: Use of the Content-Disposition Header Field in the
         Hypertext Transfer Protocol (HTTP)}
  */
  ContentDisposition: "Content-Disposition",
  /**
   * HTTP Header Content-Encoding
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.4: HTTP Semantics}
   */
  ContentEncoding: "Content-Encoding",
  /**
   * HTTP Header Content-Language
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.5: HTTP Semantics}
   */
  ContentLanguage: "Content-Language",
  /**
   * HTTP Header Content-Length
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.6: HTTP Semantics}
   */
  ContentLength: "Content-Length",
  /**
   * HTTP Header Content-Location
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.7: HTTP Semantics}
   */
  ContentLocation: "Content-Location",
  /**
   * HTTP Header Content-Range
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 14.4: HTTP Semantics}
   */
  ContentRange: "Content-Range",
  /**
   * HTTP Header Content-Security-Policy
   *
   * @see {@link https://www.w3.org/TR/CSP/#csp-header | Content Security Policy Level 3}
   */
  ContentSecurityPolicy: "Content-Security-Policy",
  /**
   * HTTP Header Content-Security-Policy-Report-Only
   *
   * @see {@link https://www.w3.org/TR/CSP/#cspro-header | Content Security Policy Level 3}
   */
  ContentSecurityPolicyReportOnly: "Content-Security-Policy-Report-Only",
  /**
   * HTTP Header Content-Type
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.3: HTTP Semantics}
   */
  ContentType: "Content-Type",
  /**
   * HTTP Header Cookie
   *
   * @see {@link https://www.iana.org/go/rfc6265 | RFC 6265: HTTP State Management Mechanism}
   */
  Cookie: "Cookie",
  /**
   * HTTP Header Cross-Origin-Embedder-Policy
   *
   * @see {@link https://html.spec.whatwg.org/multipage/origin.html#cross-origin-embedder-policy | HTML}
   */
  CrossOriginEmbedderPolicy: "Cross-Origin-Embedder-Policy",
  /**
   * HTTP Header Cross-Origin-Embedder-Policy-Report-Only
   *
   * @see {@link https://html.spec.whatwg.org/multipage/origin.html#cross-origin-embedder-policy-report-only | HTML}
   */
  CrossOriginEmbedderPolicyReportOnly: "Cross-Origin-Embedder-Policy-Report-Only",
  /**
   * HTTP Header Cross-Origin-Opener-Policy
   *
   * @see {@link https://html.spec.whatwg.org/multipage/origin.html#cross-origin-opener-policy-2 | HTML}
   */
  CrossOriginOpenerPolicy: "Cross-Origin-Opener-Policy",
  /**
   * HTTP Header Cross-Origin-Opener-Policy-Report-Only
   *
   * @see {@link https://html.spec.whatwg.org/multipage/origin.html#cross-origin-opener-policy-report-only | HTML}
   */
  CrossOriginOpenerPolicyReportOnly: "Cross-Origin-Opener-Policy-Report-Only",
  /**
   * HTTP Header Cross-Origin-Resource-Policy
   *
   * @see {@link https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header | Fetch}
   */
  CrossOriginResourcePolicy: "Cross-Origin-Resource-Policy",
  /**
   * HTTP Header DASL
   *
   * @see {@link https://www.iana.org/go/rfc5323 | RFC 5323: Web Distributed Authoring and Versioning (WebDAV) SEARCH}
   */
  DASL: "DASL",
  /**
   * HTTP Header Date
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 6.6.1: HTTP Semantics}
   */
  Date: "Date",
  /**
   * HTTP Header DAV
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  DAV: "DAV",
  /**
   * HTTP Header Delta-Base
   *
   * @see {@link https://www.iana.org/go/rfc3229 | RFC 3229: Delta encoding in HTTP}
   */
  DeltaBase: "Delta-Base",
  /**
   * HTTP Header Depth
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  Depth: "Depth",
  /**
   * HTTP Header Destination
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  Destination: "Destination",
  /**
   * HTTP Header DPoP
   *
   * @see {@link https://www.iana.org/go/rfc9449 | RFC9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)}
   */
  DPoP: "DPoP",
  /**
   * HTTP Header DPoP-Nonce
   *
   * @see {@link https://www.iana.org/go/rfc9449 | RFC9449: OAuth 2.0 Demonstrating Proof of Possession (DPoP)}
   */
  DpopNonce: "DPoP-Nonce",
  /**
   * HTTP Header Early-Data
   *
   * @see {@link https://www.iana.org/go/rfc8470 | RFC 8470: Using Early Data in HTTP}
   */
  EarlyData: "Early-Data",
  /**
   * HTTP Header ETag
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.8.3: HTTP Semantics}
   */
  ETag: "ETag",
  /**
   * HTTP Header Expect
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.1.1: HTTP Semantics}
   */
  Expect: "Expect",
  /**
   * HTTP Header Expires
   *
   * @see {@link https://www.iana.org/go/rfc9111 | RFC9111, Section 5.3: HTTP Caching}
   */
  Expires: "Expires",
  /**
   * HTTP Header Forwarded
   *
   * @see {@link https://www.iana.org/go/rfc7239 | RFC 7239: Forwarded HTTP Extension}
   */
  Forwarded: "Forwarded",
  /**
   * HTTP Header From
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.1.2: HTTP Semantics}
   */
  From: "From",
  /**
   * HTTP Header Hobareg
   *
   * @see {@link https://www.iana.org/go/rfc7486 | RFC 7486, Section 6.1.1: HTTP Origin-Bound Authentication (HOBA)}
   */
  Hobareg: "Hobareg",
  /**
   * HTTP Header Host
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 7.2: HTTP Semantics}
   */
  Host: "Host",
  /**
   * HTTP Header If
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  If: "If",
  /**
   * HTTP Header If-Match
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 13.1.1: HTTP Semantics}
   */
  IfMatch: "If-Match",
  /**
   * HTTP Header If-Modified-Since
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 13.1.3: HTTP Semantics}
   */
  IfModifiedSince: "If-Modified-Since",
  /**
   * HTTP Header If-None-Match
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 13.1.2: HTTP Semantics}
   */
  IfNoneMatch: "If-None-Match",
  /**
   * HTTP Header If-Range
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 13.1.5: HTTP Semantics}
   */
  IfRange: "If-Range",
  /**
   * HTTP Header If-Schedule-Tag-Match
   *
   * @see {@link https://www.iana.org/go/rfc6638 |  RFC 6338: Scheduling Extensions to CalDAV}
   */
  IfScheduleTagMatch: "If-Schedule-Tag-Match",
  /**
   * HTTP Header If-Unmodified-Since
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 13.1.4: HTTP Semantics}
   */
  IfUnmodifiedSince: "If-Unmodified-Since",
  /**
   * HTTP Header IM
   *
   * @see {@link https://www.iana.org/go/rfc3229 | RFC 3229: Delta encoding in HTTP}
   */
  IM: "IM",
  /**
   * HTTP Header Include-Referred-Token-Binding-ID
   *
   * @see {@link https://www.iana.org/go/rfc8473 | RFC 8473: Token Binding over HTTP}
   */
  IncludeReferredTokenBindingId: "Include-Referred-Token-Binding-ID",
  /**
   * HTTP Header Keep-Alive
   *
   * @see {@link https://www.iana.org/go/rfc2068 | RFC 2068: Hypertext Transfer Protocol -- HTTP/1.1}
   */
  KeepAlive: "Keep-Alive",
  /**
   * HTTP Header Label
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC 3253: Versioning Extensions to WebDAV: (Web Distributed Authoring and Versioning)}
   */
  Label: "Label",
  /**
   * HTTP Header Last-Event-ID
   *
   * @see {@link https://html.spec.whatwg.org/multipage/server-sent-events.html#last-event-id | HTML}
   */
  LastEventId: "Last-Event-ID",
  /**
   * HTTP Header Last-Modified
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 8.8.2: HTTP Semantics}
   */
  LastModified: "Last-Modified",
  /**
   * HTTP Header Link
   *
   * @see {@link https://www.iana.org/go/rfc8288 | RFC 8288: Web Linking}
   */
  Link: "Link",
  /**
   * HTTP Header Location
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.2.2: HTTP Semantics}
   */
  Location: "Location",
  /**
   * HTTP Header Lock-Token
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  LockToken: "Lock-Token",
  /**
   * HTTP Header Max-Forwards
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 7.6.2: HTTP Semantics}
   */
  MaxForwards: "Max-Forwards",
  /**
   * HTTP Header Memento-Datetime
   *
   * @see {@link https://www.iana.org/go/rfc7089 | RFC 7089: HTTP Framework for Time-Based Access to Resource States -- Memento}
   */
  MementoDatetime: "Memento-Datetime",
  /**
   * HTTP Header Meter
   *
   * @see {@link https://www.iana.org/go/rfc2227 | RFC 2227: Simple Hit-Metering and Usage-Limiting for HTTP}
   */
  Meter: "Meter",
  /**
   * HTTP Header MIME-Version
   *
   * @see {@link https://www.iana.org/go/rfc9112 | RFC9112, Appendix B.1: HTTP/1.1}
   */
  MimeVersion: "MIME-Version",
  /**
   * HTTP Header Negotiate
   *
   * @see {@link https://www.iana.org/go/rfc2295 | RFC 2295: Transparent Content Negotiation in HTTP}
   */
  Negotiate: "Negotiate",
  /**
   * HTTP Header NEL
   *
   * @see {@link https://www.w3.org/TR/network-error-logging/ | Network Error Logging}
   */
  NEL: "NEL",
  /**
   * HTTP Header OData-EntityId
   *
   * @see {@link http://docs.oasis-open.org/odata/odata/v4.01/csprd05/part1-protocol/odata-v4.01-csprd05-part1-protocol.html#_Toc14172735 | OData Version 4.01 Part 1: Protocol}
   * @see {@link #OASIS | OASIS}
   * @see {@link #Chet_Ensign | Chet_Ensign}
   */
  OdataEntityid: "OData-EntityId",
  /**
   * HTTP Header OData-Isolation
   *
   * @see {@link http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_HeaderIsolationODataIsolation | OData Version 4.01 Part 1: Protocol}
   * @see {@link #OASIS | OASIS}
   * @see {@link #Chet_Ensign | Chet_Ensign}
   */
  OdataIsolation: "OData-Isolation",
  /**
   * HTTP Header OData-MaxVersion
   *
   * @see {@link http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_HeaderODataMaxVersion | OData Version 4.01 Part 1: Protocol}
   * @see {@link #OASIS | OASIS}
   * @see {@link #Chet_Ensign | Chet_Ensign}
   */
  OdataMaxversion: "OData-MaxVersion",
  /**
   * HTTP Header OData-Version
   *
   * @see {@link http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_HeaderODataVersion | OData Version 4.01 Part 1: Protocol}
   * @see {@link #OASIS | OASIS}
   * @see {@link #Chet_Ensign | Chet_Ensign}
   */
  OdataVersion: "OData-Version",
  /**
   * HTTP Header Optional-WWW-Authenticate
   *
   * @see {@link https://www.iana.org/go/rfc8053 | RFC 8053, Section 3: HTTP Authentication Extensions for Interactive Clients}
   */
  OptionalWwwAuthenticate: "Optional-WWW-Authenticate",
  /**
   * HTTP Header Ordering-Type
   *
   * @see {@link https://www.iana.org/go/rfc3648 | RFC 3648: Web Distributed Authoring and Versioning (WebDAV) Ordered Collections Protocol}
   */
  OrderingType: "Ordering-Type",
  /**
   * HTTP Header Origin
   *
   * @see {@link https://www.iana.org/go/rfc6454 | RFC 6454: The Web Origin Concept}
   */
  Origin: "Origin",
  /**
   * HTTP Header Origin-Agent-Cluster
   *
   * @see {@link https://html.spec.whatwg.org/multipage/origin.html#origin-agent-cluster | HTML}
   */
  OriginAgentCluster: "Origin-Agent-Cluster",
  /**
   * HTTP Header OSCORE
   *
   * @see {@link https://www.iana.org/go/rfc8613 | RFC 8613, Section 11.1: Object Security for Constrained RESTful Environments (OSCORE)}
   */
  OSCORE: "OSCORE",
  /**
   * HTTP Header OSLC-Core-Version
   *
   * @see {@link https://docs.oasis-open-projects.org/oslc-op/core/v3.0/oslc-core.html | OASIS Project Specification 01}
   * @see {@link #OASIS | OASIS}
   * @see {@link #Chet_Ensign | Chet_Ensign}
   */
  OslcCoreVersion: "OSLC-Core-Version",
  /**
   * HTTP Header Overwrite
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  Overwrite: "Overwrite",
  /**
   * HTTP Header Ping-From
   *
   * @see {@link https://html.spec.whatwg.org/multipage/links.html#ping-from | HTML}
   */
  PingFrom: "Ping-From",
  /**
   * HTTP Header Ping-To
   *
   * @see {@link https://html.spec.whatwg.org/multipage/links.html#ping-to | HTML}
   */
  PingTo: "Ping-To",
  /**
   * HTTP Header Position
   *
   * @see {@link https://www.iana.org/go/rfc3648 | RFC 3648: Web Distributed Authoring and Versioning (WebDAV) Ordered Collections Protocol}
   */
  Position: "Position",
  /**
   * HTTP Header Prefer
   *
   * @see {@link https://www.iana.org/go/rfc7240 | RFC 7240: Prefer Header for HTTP}
   */
  Prefer: "Prefer",
  /**
   * HTTP Header Preference-Applied
   *
   * @see {@link https://www.iana.org/go/rfc7240 | RFC 7240: Prefer Header for HTTP}
   */
  PreferenceApplied: "Preference-Applied",
  /**
   * HTTP Header Priority
   *
   * @see {@link https://www.iana.org/go/rfc9218 | RFC9218: Extensible Prioritization Scheme for HTTP}
   */
  Priority: "Priority",
  /**
   * HTTP Header Proxy-Authenticate
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.7.1: HTTP Semantics}
   */
  ProxyAuthenticate: "Proxy-Authenticate",
  /**
   * HTTP Header Proxy-Authentication-Info
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.7.3: HTTP Semantics}
   */
  ProxyAuthenticationInfo: "Proxy-Authentication-Info",
  /**
   * HTTP Header Proxy-Authorization
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.7.2: HTTP Semantics}
   */
  ProxyAuthorization: "Proxy-Authorization",
  /**
   * HTTP Header Proxy-Status
   *
   * @see {@link https://www.iana.org/go/rfc9209 | RFC9209: The Proxy-Status HTTP Response Header Field}
   */
  ProxyStatus: "Proxy-Status",
  /**
   * HTTP Header Public-Key-Pins
   *
   * @see {@link https://www.iana.org/go/rfc7469 | RFC 7469: Public Key Pinning Extension for HTTP}
   */
  PublicKeyPins: "Public-Key-Pins",
  /**
   * HTTP Header Public-Key-Pins-Report-Only
   *
   * @see {@link https://www.iana.org/go/rfc7469 | RFC 7469: Public Key Pinning Extension for HTTP}
   */
  PublicKeyPinsReportOnly: "Public-Key-Pins-Report-Only",
  /**
   * HTTP Header Range
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 14.2: HTTP Semantics}
   */
  Range: "Range",
  /**
   * HTTP Header Redirect-Ref
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC 4437: Web Distributed Authoring and Versioning (WebDAV) Redirect Reference Resources}
   */
  RedirectRef: "Redirect-Ref",
  /**
   * HTTP Header Referer
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.1.3: HTTP Semantics}
   */
  Referer: "Referer",
  /**
   * HTTP Header Refresh
   *
   * @see {@link https://html.spec.whatwg.org/multipage/browsing-the-web.html#refresh | HTML}
   */
  Refresh: "Refresh",
  /**
   * HTTP Header Replay-Nonce
   *
   * @see {@link https://www.iana.org/go/rfc8555 | RFC 8555, Section 6.5.1: Automatic Certificate Management Environment (ACME)}
   */
  ReplayNonce: "Replay-Nonce",
  /**
   * HTTP Header Repr-Digest
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-digest-headers-13 | RFC-ietf-httpbis-digest-headers-13, Section 3: Digest Fields}
   */
  ReprDigest: "Repr-Digest",
  /**
   * HTTP Header Retry-After
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.2.3: HTTP Semantics}
   */
  RetryAfter: "Retry-After",
  /**
   * HTTP Header Schedule-Reply
   *
   * @see {@link https://www.iana.org/go/rfc6638 | RFC 6638: Scheduling Extensions to CalDAV}
   */
  ScheduleReply: "Schedule-Reply",
  /**
   * HTTP Header Schedule-Tag
   *
   * @see {@link https://www.iana.org/go/rfc6638 | RFC 6338: Scheduling Extensions to CalDAV}
   */
  ScheduleTag: "Schedule-Tag",
  /**
   * HTTP Header Sec-Purpose
   *
   * @see {@link https://fetch.spec.whatwg.org/#sec-purpose-header | Fetch}
   */
  SecPurpose: "Sec-Purpose",
  /**
   * HTTP Header Sec-Token-Binding
   *
   * @see {@link https://www.iana.org/go/rfc8473 | RFC 8473: Token Binding over HTTP}
   */
  SecTokenBinding: "Sec-Token-Binding",
  /**
   * HTTP Header Sec-WebSocket-Accept
   *
   * @see {@link https://www.iana.org/go/rfc6455 | RFC 6455: The WebSocket Protocol}
   */
  SecWebsocketAccept: "Sec-WebSocket-Accept",
  /**
   * HTTP Header Sec-WebSocket-Extensions
   *
   * @see {@link https://www.iana.org/go/rfc6455 | RFC 6455: The WebSocket Protocol}
   */
  SecWebsocketExtensions: "Sec-WebSocket-Extensions",
  /**
   * HTTP Header Sec-WebSocket-Key
   *
   * @see {@link https://www.iana.org/go/rfc6455 | RFC 6455: The WebSocket Protocol}
   */
  SecWebsocketKey: "Sec-WebSocket-Key",
  /**
   * HTTP Header Sec-WebSocket-Protocol
   *
   * @see {@link https://www.iana.org/go/rfc6455 | RFC 6455: The WebSocket Protocol}
   */
  SecWebsocketProtocol: "Sec-WebSocket-Protocol",
  /**
   * HTTP Header Sec-WebSocket-Version
   *
   * @see {@link https://www.iana.org/go/rfc6455 | RFC 6455: The WebSocket Protocol}
   */
  SecWebsocketVersion: "Sec-WebSocket-Version",
  /**
   * HTTP Header Server
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.2.4: HTTP Semantics}
   */
  Server: "Server",
  /**
   * HTTP Header Server-Timing
   *
   * @see {@link https://www.w3.org/TR/server-timing/ | Server Timing}
   */
  ServerTiming: "Server-Timing",
  /**
   * HTTP Header Set-Cookie
   *
   * @see {@link https://www.iana.org/go/rfc6265 | RFC 6265: HTTP State Management Mechanism}
   */
  SetCookie: "Set-Cookie",
  /**
   * HTTP Header Signature
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-message-signatures-19 | RFC-ietf-httpbis-message-signatures-19, Section 4.2: HTTP Message Signatures}
   */
  Signature: "Signature",
  /**
   * HTTP Header Signature-Input
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-message-signatures-19 | RFC-ietf-httpbis-message-signatures-19, Section 4.1: HTTP Message Signatures}
   */
  SignatureInput: "Signature-Input",
  /**
   * HTTP Header SLUG
   *
   * @see {@link https://www.iana.org/go/rfc5023 | RFC 5023: The Atom Publishing Protocol}
   */
  SLUG: "SLUG",
  /**
   * HTTP Header SoapAction
   *
   * @see {@link https://www.w3.org/TR/2000/NOTE-SOAP-20000508 | Simple Object Access Protocol (SOAP) 1.1}
   */
  SoapAction: "SoapAction",
  /**
   * HTTP Header Status-URI
   *
   * @see {@link https://www.iana.org/go/rfc2518 | RFC 2518: HTTP Extensions for Distributed Authoring -- WEBDAV}
   */
  StatusUri: "Status-URI",
  /**
   * HTTP Header Strict-Transport-Security
   *
   * @see {@link https://www.iana.org/go/rfc6797 | RFC 6797: HTTP Strict Transport Security (HSTS)}
   */
  StrictTransportSecurity: "Strict-Transport-Security",
  /**
   * HTTP Header Sunset
   *
   * @see {@link https://www.iana.org/go/rfc8594 | RFC 8594: The Sunset HTTP Header Field}
   */
  Sunset: "Sunset",
  /**
   * HTTP Header TCN
   *
   * @see {@link https://www.iana.org/go/rfc2295 | RFC 2295: Transparent Content Negotiation in HTTP}
   */
  TCN: "TCN",
  /**
   * HTTP Header TE
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.1.4: HTTP Semantics}
   */
  TE: "TE",
  /**
   * HTTP Header Timeout
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC 4918: HTTP Extensions for Web Distributed Authoring and Versioning (WebDAV)}
   */
  Timeout: "Timeout",
  /**
   * HTTP Header Topic
   *
   * @see {@link https://www.iana.org/go/rfc8030 | RFC 8030, Section 5.4: Generic Event Delivery Using HTTP Push}
   */
  Topic: "Topic",
  /**
   * HTTP Header Traceparent
   *
   * @see {@link https://www.w3.org/TR/trace-context/#traceparent-header | Trace Context}
   */
  Traceparent: "Traceparent",
  /**
   * HTTP Header Tracestate
   *
   * @see {@link https://www.w3.org/TR/trace-context/#tracestate-header | Trace Context}
   */
  Tracestate: "Tracestate",
  /**
   * HTTP Header Trailer
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 6.6.2: HTTP Semantics}
   */
  Trailer: "Trailer",
  /**
   * HTTP Header Transfer-Encoding
   *
   * @see {@link https://www.iana.org/go/rfc9112 | RFC9112, Section 6.1: HTTP Semantics}
   */
  TransferEncoding: "Transfer-Encoding",
  /**
   * HTTP Header TTL
   *
   * @see {@link https://www.iana.org/go/rfc8030 | RFC 8030, Section 5.2: Generic Event Delivery Using HTTP Push}
   */
  TTL: "TTL",
  /**
   * HTTP Header Upgrade
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 7.8: HTTP Semantics}
   */
  Upgrade: "Upgrade",
  /**
   * HTTP Header Urgency
   *
   * @see {@link https://www.iana.org/go/rfc8030 | RFC 8030, Section 5.3: Generic Event Delivery Using HTTP Push}
   */
  Urgency: "Urgency",
  /**
   * HTTP Header User-Agent
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 10.1.5: HTTP Semantics}
   */
  UserAgent: "User-Agent",
  /**
   * HTTP Header Variant-Vary
   *
   * @see {@link https://www.iana.org/go/rfc2295 | RFC 2295: Transparent Content Negotiation in HTTP}
   */
  VariantVary: "Variant-Vary",
  /**
   * HTTP Header Vary
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 12.5.5: HTTP Semantics}
   */
  Vary: "Vary",
  /**
   * HTTP Header Via
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 7.6.3: HTTP Semantics}
   */
  Via: "Via",
  /**
   * HTTP Header Want-Content-Digest
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-digest-headers-13 | RFC-ietf-httpbis-digest-headers-13, Section 4: Digest Fields}
   */
  WantContentDigest: "Want-Content-Digest",
  /**
   * HTTP Header Want-Repr-Digest
   *
   * @see {@link https://www.iana.org/go/draft-ietf-httpbis-digest-headers-13 | RFC-ietf-httpbis-digest-headers-13, Section 4: Digest Fields}
   */
  WantReprDigest: "Want-Repr-Digest",
  /**
   * HTTP Header WWW-Authenticate
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 11.6.1: HTTP Semantics}
   */
  WwwAuthenticate: "WWW-Authenticate",
  /**
   * HTTP Header X-Content-Type-Options
   *
   * @see {@link https://fetch.spec.whatwg.org/#x-content-type-options-header | Fetch}
   */
  XContentTypeOptions: "X-Content-Type-Options",
  /**
   * HTTP Header X-Frame-Options
   *
   * @see {@link https://html.spec.whatwg.org/multipage/browsing-the-web.html#x-frame-options | HTML}
   */
  XFrameOptions: "X-Frame-Options"
};

// deno:https://jsr.io/@std/http/1.1.3/unstable_method.ts
var METHOD = {
  /**
   * ACL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3744 | RFC3744, Section 8.1}
   */
  Acl: "ACL",
  /**
   * BASELINE-CONTROL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 12.6}
   */
  BaselineControl: "BASELINE-CONTROL",
  /**
   * BIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 4}
   */
  Bind: "BIND",
  /**
   * CHECKIN (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.4, Section 9.4}
   */
  Checkin: "CHECKIN",
  /**
   * CHECKOUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.3, Section 8.8}
   */
  Checkout: "CHECKOUT",
  /**
   * CONNECT (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.6}
   */
  Connect: "CONNECT",
  /**
   * COPY (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.8}
   */
  Copy: "COPY",
  /**
   * DELETE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.5}
   */
  Delete: "DELETE",
  /**
   * GET (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.1}
   */
  Get: "GET",
  /**
   * HEAD (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.2}
   */
  Head: "HEAD",
  /**
   * LABEL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 8.2}
   */
  Label: "LABEL",
  /**
   * LINK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc2068 | RFC2068, Section 19.6.1.2}
   */
  Link: "LINK",
  /**
   * LOCK (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.10}
   */
  Lock: "LOCK",
  /**
   * MERGE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 11.2}
   */
  Merge: "MERGE",
  /**
   * MKACTIVITY (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 13.5}
   */
  Mkactivity: "MKACTIVITY",
  /**
   * MKCALENDAR (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4791 | RFC4791, Section 5.3.1}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.3}
   */
  Mkcalendar: "MKCALENDAR",
  /**
   * MKCOL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.3}
   * @see {@link https://www.iana.org/go/rfc5689 | RFC5689, Section 3}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.3}
   */
  Mkcol: "MKCOL",
  /**
   * MKREDIRECTREF (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC4437, Section 6}
   */
  Mkredirectref: "MKREDIRECTREF",
  /**
   * MKWORKSPACE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 6.3}
   */
  Mkworkspace: "MKWORKSPACE",
  /**
   * MOVE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.9}
   */
  Move: "MOVE",
  /**
   * OPTIONS (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.7}
   */
  Options: "OPTIONS",
  /**
   * ORDERPATCH (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3648 | RFC3648, Section 7}
   */
  Orderpatch: "ORDERPATCH",
  /**
   * PATCH (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc5789 | RFC5789, Section 2}
   */
  Patch: "PATCH",
  /**
   * POST (Safe: no; Idempotent: no)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.3}
   */
  Post: "POST",
  /**
   * PRI (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9113 | RFC9113, Section 3.4}
   */
  Pri: "PRI",
  /**
   * PROPFIND (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.1}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.1}
   */
  Propfind: "PROPFIND",
  /**
   * PROPPATCH (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.2}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.2}
   */
  Proppatch: "PROPPATCH",
  /**
   * PUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.4}
   */
  Put: "PUT",
  /**
   * REBIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 6}
   */
  Rebind: "REBIND",
  /**
   * REPORT (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 3.6}
   * @see {@link https://www.iana.org/go/rfc8144 | RFC8144, Section 2.1}
   */
  Report: "REPORT",
  /**
   * SEARCH (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5323 | RFC5323, Section 2}
   */
  Search: "SEARCH",
  /**
   * TRACE (Safe: yes; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc9110 | RFC9110, Section 9.3.8}
   */
  Trace: "TRACE",
  /**
   * UNBIND (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc5842 | RFC5842, Section 5}
   */
  Unbind: "UNBIND",
  /**
   * UNCHECKOUT (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 4.5}
   */
  Uncheckout: "UNCHECKOUT",
  /**
   * UNLINK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc2068 | RFC2068, Section 19.6.1.3}
   */
  Unlink: "UNLINK",
  /**
   * UNLOCK (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4918 | RFC4918, Section 9.11}
   */
  Unlock: "UNLOCK",
  /**
   * UPDATE (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 7.1}
   */
  Update: "UPDATE",
  /**
   * UPDATEREDIRECTREF (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc4437 | RFC4437, Section 7}
   */
  Updateredirectref: "UPDATEREDIRECTREF",
  /**
   * VERSION-CONTROL (Safe: no; Idempotent: yes)
   *
   * @see {@link https://www.iana.org/go/rfc3253 | RFC3253, Section 3.5}
   */
  VersionControl: "VERSION-CONTROL"
};

// deno:https://jsr.io/@std/html/1.0.7/unstable_html.ts
function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] ?? ""), "");
}

// deno:https://jsr.io/@std/http/1.1.3/file_server.ts
var ENV_PERM_STATUS = typeof Deno !== "undefined" ? Deno.permissions.querySync?.({
  name: "env",
  variable: "DENO_DEPLOYMENT_ID"
}).state ?? "granted" : "granted";
var NET_PERM_STATUS = typeof Deno !== "undefined" ? Deno.permissions.querySync?.({
  name: "sys",
  kind: "networkInterfaces"
}).state ?? "granted" : "granted";
var DENO_DEPLOYMENT_ID = ENV_PERM_STATUS === "granted" && typeof Deno !== "undefined" ? Deno.env.get("DENO_DEPLOYMENT_ID") : void 0;
var HASHED_DENO_DEPLOYMENT_ID = DENO_DEPLOYMENT_ID ? eTag(DENO_DEPLOYMENT_ID, {
  weak: true
}) : void 0;
function modeToString(isDir, maybeMode) {
  const modeMap = [
    "---",
    "--x",
    "-w-",
    "-wx",
    "r--",
    "r-x",
    "rw-",
    "rwx"
  ];
  if (maybeMode === null) {
    return "(unknown mode)";
  }
  const mode = maybeMode.toString(8).padStart(3, "0");
  let output = "";
  mode.split("").reverse().slice(0, 3).forEach((v) => {
    output = `${modeMap[+v]} ${output}`;
  });
  output = `${isDir ? "d" : "-"} ${output}`;
  return output;
}
function createStandardResponse(status, init) {
  const statusText = STATUS_TEXT[status];
  return new Response(statusText, {
    status,
    statusText,
    ...init
  });
}
function parseRangeHeader(rangeValue, fileSize) {
  const rangeRegex = /bytes=(?<start>\d+)?-(?<end>\d+)?$/u;
  const parsed = rangeValue.match(rangeRegex);
  if (!parsed || !parsed.groups) {
    return null;
  }
  const { start, end } = parsed.groups;
  if (start !== void 0) {
    if (end !== void 0) {
      return {
        start: +start,
        end: +end
      };
    } else {
      return {
        start: +start,
        end: fileSize - 1
      };
    }
  } else {
    if (end !== void 0) {
      return {
        start: fileSize - +end,
        end: fileSize - 1
      };
    } else {
      return null;
    }
  }
}
async function serveFile(req, filePath, options) {
  await req.body?.cancel();
  if (req.method !== METHOD.Get && req.method !== METHOD.Head) {
    return createStandardResponse(STATUS_CODE.MethodNotAllowed);
  }
  let { etagAlgorithm: algorithm = "SHA-256", fileInfo } = options ?? {};
  try {
    fileInfo ??= await Deno.stat(filePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return createStandardResponse(STATUS_CODE.NotFound);
    } else {
      throw error;
    }
  }
  if (fileInfo.isDirectory) {
    return createStandardResponse(STATUS_CODE.NotFound);
  }
  const headers = createBaseHeaders();
  const etag = fileInfo.mtime ? await eTag(fileInfo, {
    algorithm
  }) : await HASHED_DENO_DEPLOYMENT_ID;
  if (fileInfo.mtime) {
    headers.set(HEADER.LastModified, fileInfo.mtime.toUTCString());
  }
  if (etag) {
    headers.set(HEADER.ETag, etag);
  }
  const contentTypeValue = contentType(extname3(filePath));
  if (contentTypeValue) {
    headers.set(HEADER.ContentType, contentTypeValue);
  }
  const fileSize = fileInfo.size;
  if (req.method === METHOD.Head) {
    headers.set(HEADER.ContentLength, `${fileSize}`);
    const status2 = STATUS_CODE.OK;
    return new Response(null, {
      status: status2,
      statusText: STATUS_TEXT[status2],
      headers
    });
  }
  if (etag || fileInfo.mtime) {
    const ifNoneMatchValue = req.headers.get(HEADER.IfNoneMatch);
    const ifModifiedSinceValue = req.headers.get(HEADER.IfModifiedSince);
    if (!ifNoneMatch(ifNoneMatchValue, etag) || ifNoneMatchValue === null && fileInfo.mtime && ifModifiedSinceValue && fileInfo.mtime.getTime() < new Date(ifModifiedSinceValue).getTime() + 1e3) {
      const status2 = STATUS_CODE.NotModified;
      return new Response(null, {
        status: status2,
        statusText: STATUS_TEXT[status2],
        headers
      });
    }
  }
  const rangeValue = req.headers.get(HEADER.Range);
  if (rangeValue && 0 < fileSize) {
    const parsed = parseRangeHeader(rangeValue, fileSize);
    if (!parsed) {
      headers.set(HEADER.ContentLength, `${fileSize}`);
      const file3 = await Deno.open(filePath);
      const status3 = STATUS_CODE.OK;
      return new Response(file3.readable, {
        status: status3,
        statusText: STATUS_TEXT[status3],
        headers
      });
    }
    if (parsed.end < 0 || parsed.end < parsed.start || fileSize <= parsed.start) {
      headers.set(HEADER.ContentRange, `bytes */${fileSize}`);
      return createStandardResponse(STATUS_CODE.RangeNotSatisfiable, {
        headers
      });
    }
    const start = Math.max(0, parsed.start);
    const end = Math.min(parsed.end, fileSize - 1);
    headers.set(HEADER.ContentRange, `bytes ${start}-${end}/${fileSize}`);
    const contentLength = end - start + 1;
    headers.set(HEADER.ContentLength, `${contentLength}`);
    const file2 = await Deno.open(filePath);
    await file2.seek(start, Deno.SeekMode.Start);
    const sliced = file2.readable.pipeThrough(new ByteSliceStream(0, contentLength - 1));
    const status2 = STATUS_CODE.PartialContent;
    return new Response(sliced, {
      status: status2,
      statusText: STATUS_TEXT[status2],
      headers
    });
  }
  headers.set(HEADER.ContentLength, `${fileSize}`);
  const file = await Deno.open(filePath);
  const status = STATUS_CODE.OK;
  return new Response(file.readable, {
    status,
    statusText: STATUS_TEXT[status],
    headers
  });
}
async function serveDirIndex(req, dirPath, options) {
  const { showDotfiles } = options;
  const dirUrl = `/${relative3(options.target, dirPath).replaceAll(new RegExp(SEPARATOR_PATTERN, "g"), "/")}`;
  const listEntryPromise = [];
  if (dirUrl !== "/") {
    const prevPath = join3(dirPath, "..");
    const entryInfo = Deno.stat(prevPath).then((fileInfo) => ({
      mode: modeToString(true, fileInfo.mode),
      size: "",
      name: "../",
      url: ".."
    }));
    listEntryPromise.push(entryInfo);
  }
  for await (const entry of Deno.readDir(dirPath)) {
    if (!showDotfiles && entry.name[0] === ".") {
      continue;
    }
    const filePath = join3(dirPath, entry.name);
    const fileUrl = encodeURIComponent(entry.name).replaceAll("%2F", "/");
    listEntryPromise.push((async () => {
      try {
        const fileInfo = await Deno.stat(filePath);
        return {
          mode: modeToString(entry.isDirectory, fileInfo.mode),
          size: entry.isFile ? format(fileInfo.size ?? 0) : "",
          name: `${entry.name}${entry.isDirectory ? "/" : ""}`,
          url: `./${fileUrl}${entry.isDirectory ? "/" : ""}`
        };
      } catch (error) {
        if (!options.quiet) logError(error);
        return {
          mode: "(unknown mode)",
          size: "",
          name: `${entry.name}${entry.isDirectory ? "/" : ""}`,
          url: `./${fileUrl}${entry.isDirectory ? "/" : ""}`
        };
      }
    })());
  }
  const listEntry = await Promise.all(listEntryPromise);
  listEntry.sort((a, b) => a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1);
  const formattedDirUrl = `${dirUrl.replace(/\/$/, "")}/`;
  const page = dirViewerTemplate(formattedDirUrl, listEntry);
  const headers = createBaseHeaders();
  headers.set(HEADER.ContentType, "text/html; charset=UTF-8");
  if (req.method === METHOD.Head) {
    const pageSize = new TextEncoder().encode(page).byteLength;
    headers.set(HEADER.ContentLength, String(pageSize));
  }
  const status = STATUS_CODE.OK;
  return new Response(req.method === METHOD.Head ? null : page, {
    status,
    statusText: STATUS_TEXT[status],
    headers
  });
}
function serverLog(req, status) {
  const d = (/* @__PURE__ */ new Date()).toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const url = new URL(req.url);
  const s = `${dateFmt} [${req.method}] ${url.pathname}${url.search} ${status}`;
  console.debug(s);
}
function createBaseHeaders() {
  return new Headers({
    server: "deno",
    // Set "accept-ranges" so that the client knows it can make range requests on future requests
    [HEADER.AcceptRanges]: "bytes"
  });
}
function dirViewerTemplate(dirname, entries) {
  const splitDirname = dirname.split("/").filter((path) => Boolean(path));
  const headerPaths = [
    "home",
    ...splitDirname
  ];
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Deno File Server</title>
        <style>
        :root {
          --background-color: #fafafa;
          --color: rgba(0, 0, 0, 0.87);
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --background-color: #292929;
            --color: #fff;
          }
          thead {
            color: #7f7f7f;
          }
        }
        @media (min-width: 960px) {
          main {
            max-width: 960px;
          }
          body {
            padding-left: 32px;
            padding-right: 32px;
          }
        }
        @media (min-width: 600px) {
          main {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
        body {
          background: var(--background-color);
          color: var(--color);
          font-family: "Roboto", "Helvetica", "Arial", sans-serif;
          font-weight: 400;
          line-height: 1.43;
          font-size: 0.875rem;
        }
        a {
          color: #2196f3;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        thead {
          text-align: left;
        }
        thead th {
          padding-bottom: 12px;
        }
        table td {
          padding: 6px 36px 6px 0px;
        }
        .size {
          text-align: right;
          padding: 6px 12px 6px 24px;
        }
        .mode {
          font-family: monospace, monospace;
        }
        </style>
      </head>
      <body>
        <main>
          <h1>
            Index of ${headerPaths.map((path, index) => {
    if (path === "") return "";
    const depth = headerPaths.length - index - 1;
    let link;
    if (depth == 0) {
      link = ".";
    } else {
      link = "../".repeat(depth);
    }
    return html`<a href="${link}">${escape(path)}</a>`;
  }).join("/")}/
          </h1>
          <table>
            <thead>
              <tr>
                <th>Mode</th>
                <th>Size</th>
                <th>Name</th>
              </tr>
            </thead>
            ${entries.map((entry) => html`
                    <tr>
                      <td class="mode">
                        ${entry.mode}
                      </td>
                      <td class="size">
                        ${entry.size}
                      </td>
                      <td>
                        <a href="${escape(entry.url)}">${escape(entry.name)}</a>
                      </td>
                    </tr>
                  `).join("")}
          </table>
        </main>
      </body>
    </html>
  `;
}
async function serveDir(req, opts = {}) {
  if (req.method !== METHOD.Get && req.method !== METHOD.Head) {
    return createStandardResponse(STATUS_CODE.MethodNotAllowed);
  }
  let response;
  try {
    response = await createServeDirResponse(req, opts);
  } catch (error) {
    if (!opts.quiet) logError(error);
    response = error instanceof Deno.errors.NotFound ? createStandardResponse(STATUS_CODE.NotFound) : createStandardResponse(STATUS_CODE.InternalServerError);
  }
  const isRedirectResponse = isRedirectStatus(response.status);
  if (opts.enableCors && !isRedirectResponse) {
    response.headers.append(HEADER.AccessControlAllowOrigin, "*");
    response.headers.append(HEADER.AccessControlAllowHeaders, "Origin, X-Requested-With, Content-Type, Accept, Range");
  }
  if (!opts.quiet) serverLog(req, response.status);
  if (opts.headers && !isRedirectResponse) {
    for (const header of opts.headers) {
      const headerSplit = header.split(":");
      const name = headerSplit[0];
      const value = headerSplit.slice(1).join(":");
      response.headers.append(name, value);
    }
  }
  return response;
}
async function createServeDirResponse(req, opts) {
  const target = opts.fsRoot ?? ".";
  const urlRoot = opts.urlRoot;
  const showIndex = opts.showIndex ?? true;
  const cleanUrls = opts.cleanUrls ?? false;
  const showDotfiles = opts.showDotfiles || false;
  const { etagAlgorithm = "SHA-256", showDirListing = false, quiet = false } = opts;
  const url = new URL(req.url);
  const decodedUrl = decodeURIComponent(url.pathname);
  let normalizedPath = normalize(decodedUrl);
  if (urlRoot && !normalizedPath.startsWith("/" + urlRoot)) {
    return createStandardResponse(STATUS_CODE.NotFound);
  }
  if (normalizedPath !== decodedUrl) {
    url.pathname = normalizedPath;
    return Response.redirect(url, 301);
  }
  if (urlRoot) {
    normalizedPath = normalizedPath.replace(urlRoot, "");
  }
  if (normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  if (!showDotfiles && /\/\./.test(normalizedPath)) {
    return createStandardResponse(STATUS_CODE.NotFound);
  }
  let fsPath = join3(target, normalizedPath);
  if (cleanUrls && !fsPath.endsWith(".html") && !await exists(fsPath)) {
    fsPath += ".html";
  }
  const fileInfo = await Deno.stat(fsPath);
  if (fileInfo.isFile && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
    return Response.redirect(url, 301);
  }
  if (fileInfo.isDirectory && !url.pathname.endsWith("/")) {
    url.pathname += "/";
    return Response.redirect(url, 301);
  }
  if (!fileInfo.isDirectory) {
    return serveFile(req, fsPath, {
      etagAlgorithm,
      fileInfo
    });
  }
  if (showIndex) {
    const indexPath = join3(fsPath, "index.html");
    let indexFileInfo;
    try {
      indexFileInfo = await Deno.lstat(indexPath);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
    if (indexFileInfo?.isFile) {
      return serveFile(req, indexPath, {
        etagAlgorithm,
        fileInfo: indexFileInfo
      });
    }
  }
  if (showDirListing) {
    return serveDirIndex(req, fsPath, {
      showDotfiles,
      target,
      quiet
    });
  }
  return createStandardResponse(STATUS_CODE.NotFound);
}
function logError(error) {
  console.error(`%c${error.message}`, "color: red");
}
function main() {
  const serverArgs = parseArgs(Deno.args, {
    string: [
      "port",
      "host",
      "cert",
      "key",
      "header"
    ],
    boolean: [
      "help",
      "dir-listing",
      "dotfiles",
      "cors",
      "verbose",
      "version"
    ],
    negatable: [
      "dir-listing",
      "dotfiles",
      "cors"
    ],
    collect: [
      "header"
    ],
    default: {
      "dir-listing": true,
      dotfiles: true,
      cors: true,
      verbose: false,
      version: false,
      host: "0.0.0.0",
      port: void 0,
      cert: "",
      key: ""
    },
    alias: {
      p: "port",
      c: "cert",
      k: "key",
      h: "help",
      v: "verbose",
      V: "version",
      H: "header"
    }
  });
  const port = serverArgs.port ? Number(serverArgs.port) : void 0;
  const headers = serverArgs.header ?? [];
  const host = serverArgs.host;
  const certFile = serverArgs.cert;
  const keyFile = serverArgs.key;
  if (serverArgs.help) {
    printUsage();
    Deno.exit();
  }
  if (serverArgs.version) {
    console.log(`Deno File Server ${deno_default.version}`);
    Deno.exit();
  }
  if (keyFile || certFile) {
    if (keyFile === "" || certFile === "") {
      console.log("--key and --cert are required for TLS");
      printUsage();
      Deno.exit(1);
    }
  }
  const wild = serverArgs._;
  const target = resolve3(wild[0] ?? "");
  const handler = (req) => {
    return serveDir(req, {
      fsRoot: target,
      showDirListing: serverArgs["dir-listing"],
      showDotfiles: serverArgs.dotfiles,
      enableCors: serverArgs.cors,
      quiet: !serverArgs.verbose,
      headers
    });
  };
  const useTls = !!(keyFile && certFile);
  function onListen({ port: port2, hostname }) {
    let networkAddress = void 0;
    if (NET_PERM_STATUS === "granted") {
      networkAddress = getNetworkAddress();
    }
    const protocol = useTls ? "https" : "http";
    const host2 = Deno.build.os === "windows" && hostname === "0.0.0.0" ? "localhost" : hostname;
    const formattedHost = hostname.includes(":") ? `[${host2}]` : host2;
    let message = `Listening on:
- Local: ${protocol}://${formattedHost}:${port2}`;
    if (networkAddress && !DENO_DEPLOYMENT_ID) {
      message += `
- Network: ${protocol}://${networkAddress}:${port2}`;
    }
    console.log(message);
  }
  const options = {
    hostname: host,
    onListen
  };
  if (port !== void 0) {
    options.port = port;
  }
  if (useTls) {
    options.cert = Deno.readTextFileSync(certFile);
    options.key = Deno.readTextFileSync(keyFile);
  }
  Deno.serve(options, handler);
}
function printUsage() {
  console.log(`Deno File Server ${deno_default.version}
  Serves a local directory in HTTP.

INSTALL:
  deno install --allow-net --allow-read --allow-sys jsr:@std/http@${deno_default.version}/file-server

USAGE:
  file_server [path] [options]

OPTIONS:
  -h, --help            Prints help information
  -p, --port <PORT>     Set port (default is 8000)
  --cors                Enable CORS via the "Access-Control-Allow-Origin" header
  --host     <HOST>     Hostname (default is 0.0.0.0)
  -c, --cert <FILE>     TLS certificate file (enables TLS)
  -k, --key  <FILE>     TLS key file (enables TLS)
  -H, --header <HEADER> Sets a header on every request.
                        (e.g. --header "Cache-Control: no-cache")
                        This option can be specified multiple times.
  --no-dir-listing      Disable directory listing
  --no-dotfiles         Do not show dotfiles
  --no-cors             Disable cross-origin resource sharing
  -v, --verbose         Print request level logs
  -V, --version         Print version information

  All TLS options are required when one is provided.`);
}
if (import.meta.main) {
  main();
}
export {
  serveDir,
  serveFile
};
