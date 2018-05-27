(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = ((uint8[i] << 16) & 0xFF0000) + ((uint8[i + 1] << 8) & 0xFF00) + (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
arguments[4][1][0].apply(exports,arguments)
},{"dup":1}],4:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  get: function () {
    if (!(this instanceof Buffer)) {
      return undefined
    }
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value) || (value && isArrayBuffer(value.buffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (ArrayBuffer.isView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (ArrayBuffer.isView(buf)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":7}],5:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../is-buffer/index.js")})
},{"../../is-buffer/index.js":9}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],7:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],10:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],11:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = { nextTick: nextTick };
} else {
  module.exports = process
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}


}).call(this,require('_process'))
},{"_process":12}],12:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],13:[function(require,module,exports){
module.exports = require('./lib/_stream_duplex.js');

},{"./lib/_stream_duplex.js":14}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  pna.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }
    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});

Duplex.prototype._destroy = function (err, cb) {
  this.push(null);
  this.end();

  pna.nextTick(cb, err);
};

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":16,"./_stream_writable":18,"core-util-is":5,"inherits":8,"process-nextick-args":11}],15:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":17,"core-util-is":5,"inherits":8}],16:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;

/*<replacement>*/
var EE = require('events').EventEmitter;

var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = void 0;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var BufferList = require('./internal/streams/BufferList');
var destroyImpl = require('./internal/streams/destroy');
var StringDecoder;

util.inherits(Readable, Stream);

var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn);

  // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.
  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var readableHwm = options.readableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (readableHwm || readableHwm === 0)) this.highWaterMark = readableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()
  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // has it been destroyed
  this.destroyed = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  get: function () {
    if (this._readableState === undefined) {
      return false;
    }
    return this._readableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._readableState.destroyed = value;
  }
});

Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;
Readable.prototype._destroy = function (err, cb) {
  this.push(null);
  cb(err);
};

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;
      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }
      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  var state = stream._readableState;
  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);
    if (er) {
      stream.emit('error', er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) stream.emit('error', new Error('stream.unshift() after end event'));else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        stream.emit('error', new Error('stream.push() after EOF'));
      } else {
        state.reading = false;
        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
    }
  }

  return needMoreData(state);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    stream.emit('data', chunk);
    stream.read(0);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

    if (state.needReadable) emitReadable(stream);
  }
  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;
  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;
  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  }
  // If we're asking for more than the current hwm, then raise the hwm.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n;
  // Don't have enough
  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }
  return state.length;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;

  if (n !== 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
    // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.
    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  } else {
    state.length -= n;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true;

    // If we tried to read() past the EOF, then emit end on the next tick.
    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) pna.nextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    pna.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('_read() is not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) pna.nextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');
    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  // If the user pushes more data while we're writing to dest then we'll end up
  // in ondata again. However, we only want to increase awaitDrain once because
  // dest will only emit one 'drain' event for the multiple writes.
  // => Introduce a guard on increasing awaitDrain.
  var increasedAwaitDrain = false;
  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    increasedAwaitDrain = false;
    var ret = dest.write(chunk);
    if (false === ret && !increasedAwaitDrain) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
        increasedAwaitDrain = true;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }

  // Make sure our error handler is attached before userland ones.
  prependListener(dest, 'error', onerror);

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = { hasUnpiped: false };

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, unpipeInfo);
    }return this;
  }

  // try to find the right one.
  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;

  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this, unpipeInfo);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data') {
    // Start flowing on next tick if stream isn't explicitly paused
    if (this._readableState.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    var state = this._readableState;
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.emittedReadable = false;
      if (!state.reading) {
        pna.nextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    pna.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  state.awaitDrain = 0;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  while (state.flowing && stream.read() !== null) {}
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;

  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  }

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  this._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;

  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = fromListPartial(n, state.buffer, state.decoder);
  }

  return ret;
}

// Extracts only enough buffered data to satisfy the amount requested.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function fromListPartial(n, list, hasStrings) {
  var ret;
  if (n < list.head.data.length) {
    // slice is the same for buffers and strings
    ret = list.head.data.slice(0, n);
    list.head.data = list.head.data.slice(n);
  } else if (n === list.head.data.length) {
    // first chunk is a perfect match
    ret = list.shift();
  } else {
    // result spans more than one buffer
    ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
  }
  return ret;
}

// Copies a specified amount of characters from the list of buffered data
// chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBufferString(n, list) {
  var p = list.head;
  var c = 1;
  var ret = p.data;
  n -= ret.length;
  while (p = p.next) {
    var str = p.data;
    var nb = n > str.length ? str.length : n;
    if (nb === str.length) ret += str;else ret += str.slice(0, n);
    n -= nb;
    if (n === 0) {
      if (nb === str.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = str.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

// Copies a specified amount of bytes from the list of buffered data chunks.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.
function copyFromBuffer(n, list) {
  var ret = Buffer.allocUnsafe(n);
  var p = list.head;
  var c = 1;
  p.data.copy(ret);
  n -= p.data.length;
  while (p = p.next) {
    var buf = p.data;
    var nb = n > buf.length ? buf.length : n;
    buf.copy(ret, ret.length - n, 0, nb);
    n -= nb;
    if (n === 0) {
      if (nb === buf.length) {
        ++c;
        if (p.next) list.head = p.next;else list.head = list.tail = null;
      } else {
        list.head = p;
        p.data = buf.slice(nb);
      }
      break;
    }
    ++c;
  }
  list.length -= c;
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    pna.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":14,"./internal/streams/BufferList":19,"./internal/streams/destroy":20,"./internal/streams/stream":21,"_process":12,"core-util-is":5,"events":6,"inherits":8,"isarray":10,"process-nextick-args":11,"safe-buffer":26,"string_decoder/":28,"util":3}],17:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) {
    return this.emit('error', new Error('write callback called multiple times'));
  }

  ts.writechunk = null;
  ts.writecb = null;

  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);

  cb(er);

  var rs = this._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  };

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  // When the writable side finishes, then flush out anything remaining.
  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function') {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('_transform() is not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  var _this2 = this;

  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
    _this2.emit('close');
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);

  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  if (stream._writableState.length) throw new Error('Calling transform done when ws.length != 0');

  if (stream._transformState.transforming) throw new Error('Calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":14,"core-util-is":5,"inherits":8}],18:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

module.exports = Writable;

/* <replacement> */
function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;
  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : pna.nextTick;
/*</replacement>*/

/*<replacement>*/
var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream = require('./internal/streams/stream');
/*</replacement>*/

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
var OurUint8Array = global.Uint8Array || function () {};
function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}
function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

/*</replacement>*/

var destroyImpl = require('./internal/streams/destroy');

util.inherits(Writable, Stream);

function nop() {}

function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.
  var isDuplex = stream instanceof Duplex;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var writableHwm = options.writableHighWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;

  if (hwm || hwm === 0) this.highWaterMark = hwm;else if (isDuplex && (writableHwm || writableHwm === 0)) this.highWaterMark = writableHwm;else this.highWaterMark = defaultHwm;

  // cast to ints.
  this.highWaterMark = Math.floor(this.highWaterMark);

  // if _final has been called
  this.finalCalled = false;

  // drain event flag.
  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // has it been destroyed
  this.destroyed = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two
  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})();

// Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.
var realHasInstance;
if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function (object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;

      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function (object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.

  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  if (!realHasInstance.call(Writable, this) && !(this instanceof Duplex)) {
    return new Writable(options);
  }

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;

    if (typeof options.destroy === 'function') this._destroy = options.destroy;

    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe, not readable'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  pna.nextTick(cb, er);
}

// Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  var er = false;

  if (chunk === null) {
    er = new TypeError('May not write null values to stream');
  } else if (typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  if (er) {
    stream.emit('error', er);
    pna.nextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;
  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);
    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    pna.nextTick(cb, er);
    // this can emit finish, and it will always happen
    // after error
    pna.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    stream.emit('error', er);
    // this can emit finish, but finish must
    // always follow error
    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    var allBuffers = true;
    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }
    buffer.allBuffers = allBuffers;

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }
    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('_write() is not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}
function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;
    if (err) {
      stream.emit('error', err);
    }
    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}
function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function') {
      state.pendingcb++;
      state.finalCalled = true;
      pna.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    prefinish(stream, state);
    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) pna.nextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;
  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  }
  if (state.corkedRequestsFree) {
    state.corkedRequestsFree.next = corkReq;
  } else {
    state.corkedRequestsFree = corkReq;
  }
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  get: function () {
    if (this._writableState === undefined) {
      return false;
    }
    return this._writableState.destroyed;
  },
  set: function (value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    }

    // backward compatibility, the user is explicitly
    // managing destroyed
    this._writableState.destroyed = value;
  }
});

Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;
Writable.prototype._destroy = function (err, cb) {
  this.end();
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./_stream_duplex":14,"./internal/streams/destroy":20,"./internal/streams/stream":21,"_process":12,"core-util-is":5,"inherits":8,"process-nextick-args":11,"safe-buffer":26,"util-deprecate":29}],19:[function(require,module,exports){
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Buffer = require('safe-buffer').Buffer;
var util = require('util');

function copyBuffer(src, target, offset) {
  src.copy(target, offset);
}

module.exports = function () {
  function BufferList() {
    _classCallCheck(this, BufferList);

    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  BufferList.prototype.push = function push(v) {
    var entry = { data: v, next: null };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  BufferList.prototype.unshift = function unshift(v) {
    var entry = { data: v, next: this.head };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  BufferList.prototype.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  BufferList.prototype.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  BufferList.prototype.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;
    while (p = p.next) {
      ret += s + p.data;
    }return ret;
  };

  BufferList.prototype.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    if (this.length === 1) return this.head.data;
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;
    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }
    return ret;
  };

  return BufferList;
}();

if (util && util.inspect && util.inspect.custom) {
  module.exports.prototype[util.inspect.custom] = function () {
    var obj = util.inspect({ length: this.length });
    return this.constructor.name + ' ' + obj;
  };
}
},{"safe-buffer":26,"util":3}],20:[function(require,module,exports){
'use strict';

/*<replacement>*/

var pna = require('process-nextick-args');
/*</replacement>*/

// undocumented cb() API, needed for core, not for public API
function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err && (!this._writableState || !this._writableState.errorEmitted)) {
      pna.nextTick(emitErrorNT, this, err);
    }
    return this;
  }

  // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks

  if (this._readableState) {
    this._readableState.destroyed = true;
  }

  // if this is a duplex stream mark the writable part as destroyed as well
  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      pna.nextTick(emitErrorNT, _this, err);
      if (_this._writableState) {
        _this._writableState.errorEmitted = true;
      }
    } else if (cb) {
      cb(err);
    }
  });

  return this;
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy
};
},{"process-nextick-args":11}],21:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":6}],22:[function(require,module,exports){
module.exports = require('./readable').PassThrough

},{"./readable":23}],23:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":14,"./lib/_stream_passthrough.js":15,"./lib/_stream_readable.js":16,"./lib/_stream_transform.js":17,"./lib/_stream_writable.js":18}],24:[function(require,module,exports){
module.exports = require('./readable').Transform

},{"./readable":23}],25:[function(require,module,exports){
module.exports = require('./lib/_stream_writable.js');

},{"./lib/_stream_writable.js":18}],26:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":4}],27:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":6,"inherits":8,"readable-stream/duplex.js":13,"readable-stream/passthrough.js":22,"readable-stream/readable.js":23,"readable-stream/transform.js":24,"readable-stream/writable.js":25}],28:[function(require,module,exports){
'use strict';

var Buffer = require('safe-buffer').Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":26}],29:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],30:[function(require,module,exports){
 const ChessTools = require('chess-tools');

},{"chess-tools":40}],31:[function(require,module,exports){
"use strict";
let Chess = require("chess.js");
class Opening {
    constructor() {
        this.eco_code = "";
        this.variation = "";
        this.name = "";
        this.pgn = "";
    }
    toChess() {
        let pgn_short = this.pgn.substring(0, this.pgn.length-2);
        let chess = new Chess();
        chess.load_pgn(pgn_short);
        return chess;
    }
    get fen() {
        return this.toChess().fen();
    }
}
module.exports = Opening;

},{"chess.js":52}],32:[function(require,module,exports){
(function (__dirname){
"use strict";
const fs = require("fs");
const EventEmitter = require('events');
const Opening = require("./entry.js");
const Transform = require("stream").Transform;
function extract_value(text) {
  let match = text.match(/\"(.+)\"/)
  if (match) {
    // console.log("match", match[1]);
    return match[1];
  } else {
    return "";
  }
}
class ECOStream extends Transform {
  constructor() {
    super({ readableObjectMode: true });
    this._data = "";
    this._lines = [];
    this.in_comment = false;
    this.in_pgn = false;
    this.in_record = false;
    this.comment = "";
    this.current_record = false;
  }
  _flush(callback) {
    this._make_records_from_lines();
    callback();
  }
  _transform(chunk, encoding, callback) {
    let data = chunk.toString();
    let lines = data.split(/\n/m);
    if (this._lines.length > 0) {
      console.log("append to last line");
      this._lines[this.lines.length - 1] += lines.shift();
    }
    for (let line of lines) {
      this._lines.push(line);
    }
    this._make_records_from_lines();
    callback();
  }
  _make_records_from_lines() {

    let len = this._lines.length;
    for (let i = 0; i < len; i++) {
      let line = this._lines.shift();
      if (line.startsWith("{")) {
        this.in_comment = true;
      }
      if (line.startsWith("}")) {
        this.emit("has_comment", this.comment);
        this.in_comment = false;
      }
      if (this.in_comment && line !== "{") {
        this.comment = this.comment + line + "\n";
      }
      if (line.startsWith("[ECO")) {
        if (this.current_record) {
          this.current_record.pgn = this.current_record.pgn.trim();
          this.push(this.current_record);
        }
        this.current_record = new Opening();
        this.current_record.eco_code = extract_value(line);
      } else if (line.startsWith("[Opening")) {
        this.current_record.name = extract_value(line);
      } else if (line.startsWith("[Variation")) {
        this.current_record.variation = extract_value(line);
      } else if (line.startsWith("1.")) {
        this.in_pgn = true;
        this.current_record.pgn = line;
      } else if (this.in_pgn && line) {
        this.current_record.pgn = this.current_record.pgn + " " + line;
      } else if (this.in_pgn && !line) {
        this.in_pgn = false;
      }
    }
  }
}

class Eco extends EventEmitter {
  constructor() {
    super();
    this.loaded = false;
    this.comment = "";
    this.entries = [];
    this.stream = new ECOStream();
  }
  load_stream(stream) {
    this.stream.on("finish", () => {
      this.loaded = true;
      this.emit("loaded");
    });
    this.stream.on("data", (entry) => {
      this.entries.push(entry);
    });
    stream.pipe(this.stream);
  }
  load_default() {
    this.load_stream(fs.createReadStream(__dirname + "/eco.pgn"));
  }
  find(pgn) {
    if (!this.loaded) {
      throw new Error("wait for loaded event");
    }
    let best_match;
    for (let record of this.entries) {
      let r_pgn = record.pgn.substring(0, record.pgn.indexOf("*"));
      if (pgn.includes(r_pgn)) {
        if (best_match && record.pgn.length > best_match.pgn.length) {
          best_match = record;
        } else {
          best_match = record;
        }
      }
    }
    return best_match;
  }
}

module.exports = Eco;

}).call(this,"/../../node_modules/chess-tools/eco")
},{"./entry.js":31,"events":6,"fs":1,"stream":27}],33:[function(require,module,exports){
"use strict";
const EventEmitter = require("events");
const debug = require("debug")("EngineManager");

class AbstractEngineManager extends EventEmitter {
    constructor(engine, options) {
        super();
        this.name = "";
        this.heartbeat = setInterval(()=> {
            debug("HEARTBEAT-" + this.name  );
         }, 60000);
         this.engine = engine;
         this.engine.onmessage = (message) => {
            try {
             this.handleMessage(message);
            } catch (error) {
                this.emit("error", error);
                console.log("error", error);
            }
        } 
        if (options && options.name) {
            this.name = options.name;
        } 
    }
    async ponderPosition(fen, options) {
        throw new Error("Not implemented");
    }
    quit() {
        this.engine.quit();
        clearInterval(this.heartbeat);
    }
    handleMessage(message) {
        throw new Error("Not Implemented");
    }
    _sendMessage(message) {
        setTimeout(()=>{ 
            debug("SEND-" + this.name + ":" + message);
            this.engine.postMessage(message + "\n");
        }, 100);
       
    }
    getLinesForMove(move) {
        throw new Error("Not implemented");
    }
}

module.exports = AbstractEngineManager;


},{"debug":53,"events":6}],34:[function(require,module,exports){
"use strict";
const child_process = require("child_process");
const EventEmitter = require("events");
const debug = require("debug")("ChessTools");
class AbstractConnection extends EventEmitter {
    constructor() {
        super();

    }
    postMessage(message) {
        throw new Error("Must implement in subclass");
    }
    onmessage(message) {
        throw new Error("Must implement local version on message");
    }
    quit() {

    }
}
class LocalProcess extends AbstractConnection {
    constructor(executable, args) {
        super();
        debug("cmd: " + executable + " " + args);
        this.message_buffer;
        if (args) {
            this.engine = child_process.spawn(executable, args);
        } else {
            this.engine = child_process.spawn(executable);
        }
        this.engine.stderr.on('data', (error)=>{ 
            this.emit("error", error);
        });
        this.engine.stdout.on("data", (data)=>{
            let data_str = data.toString();
            if (this.message_buffer) {
               data_str = this.message_buffer + data_str;
            }
            let messages = data_str.split("\n");
            if (messages[messages.length-1] !== '') {
                this.message_buffer = messages.pop();
            }
            for (let message of messages) {
                if (message) {
                    this.onmessage(message);
                }
            }
            
        });
        this.engine.on("close", (code)=>{
          this.emit("close", code);
        });
    }
    postMessage(message) {
        if (!message.endsWith("\n")) {
            message += "\n";
        }
        this.engine.stdin.write(message);
    }
    quit() {
        if (this.engine && !this.engine.killed) {
            this.engine.kill();
        }
    }
}
module.exports = {
    AbstractConnection : AbstractConnection,
    LocalProcess : LocalProcess
};
},{"child_process":1,"debug":53,"events":6}],35:[function(require,module,exports){
"use strict";
const UCI = require("./uci.js");
const Xboard = require("./xboard.js");
const AbstractEngineManager = require("./abstract-engine-manager.js");
const { AbstractConnection, LocalProcess } = require("./connection.js");
module.exports = {
    Manager : {
        AbstractEngineManager : AbstractEngineManager,
        UCI: UCI,
        Xboard : Xboard
    },
    Connection : {
        LocalProcess : LocalProcess,
        AbstractConnection : AbstractConnection
    }
};
},{"./abstract-engine-manager.js":33,"./connection.js":34,"./uci.js":36,"./xboard.js":37}],36:[function(require,module,exports){
"use strict";
const debug = require("debug")("UCI");
const AbstractEngineManager = require("./abstract-engine-manager.js");
//UCI Protocol
//http://wbec-ridderkerk.nl/html/UCIProtocol.html
const EventEmitter = require('events');
const stream = require("stream");

class UCIEngineManager extends AbstractEngineManager {
    constructor(engine, options) {
        super(engine,options);
        let ponder_timeout = 30000;
        if (options && options.ponder_timeout) {
            ponder_timeout = options.ponder_timeout;
        }
        this.options = {
            ponder_timeout : ponder_timeout //default 30 seconds
        };
        if (options.registration) {
            this.options.registration = {
                name : options.registration.name,
                code : options.registration.code,
                later : false,
            };
        } else {
            this.options.registration = {
                later : true
            };
        }

        this.engine= engine;
        this.info = [];
        this.state = {
            initialized : false,
            is_calculating : false,
            is_ready : false,
            debug_enabled : false,
            is_evaluating : false,
        };
        this._clear_stats();
        this.positions = [];
        this.current_position = {};
        this.engine_options = {

        };
        this.engine_info = {
            options : {},
            registration : null,
            copyprotection : null,
            id : { name : '', author : '' }
        };
        this.on("initialized", this.onInitialized.bind(this));
        this.on("readyok", this.onReadyOK.bind(this));
        this._sendMessage(" ");
        this._sendMessage("uci");
        this._sendMessage("debug on");

    }
    _clear_stats() {
        this.handling_best_move = false;
        this.current_stats = {
            depth : 0,
            time : 0,
            node : 0,
            lines : [],
            currmove : "",
            currmovenumber : 0,
            hashfull : 0,
            nps : 0,
            tbhits : 0,
            cpuload : 0,
            string : "",
            refutation : "",
            currline : ""
        };
    }
    onInitialized() {
        this.state.initialized = true;

    }
    onReadyOK() {
        this.state.is_ready = true;
        this.emit("ready");
    }
    setOption(option, value) {
        if ( this.engine_info.options[option] ) {
            this.engine_info.options[option].value = value;
            this._sendMessage(this.engine_info.options[option].generateMesssage());
        } else {
            throw new Error("invalid option" + option);
        }
    }
    async ponderPosition(fen, options) {
        return new Promise(
            (resolve, reject) =>{ 
                let ponder_options = make_ponder_options_string(options, this.options.ponder_timeout);
                this._clear_stats();

                let messages = [
                    "ucinewgame"
                ]
                if (this.engine_info.options["Clear Hash"]) {
                    messages.push(this.engine_info.options["Clear Hash"].generateMesssage());
                }
                if (this.engine_info.options.UCI_ShowCurrLine) {
                    this.engine_info.options.UCI_ShowCurrLine.value = false;
                    messages.push(this.engine_info.options.UCI_ShowCurrLine.generateMesssage())
                }
                if (this.engine_info.options.UCI_AnalyseMode) {
                    this.engine_info.options.UCI_AnalyseMode.value = true;
                    messages.push(this.engine_info.options.UCI_AnalyseMode.generateMesssage())
                }
                if (options.lines && this.engine_info.options.MultiPV) {
                    if (options.lines <= this.engine_info.options.MultiPV.max ) {
                        this.engine_info.options.MultiPV.value = options.lines;
                        messages.push(this.engine_info.options.MultiPV.generateMesssage())
                    } else {
                        throw new Error("Number of lines requested exceeds engine max", this.engine_info.options.MultiPV.max);
                    }
                }
                messages.push("position fen " + fen);
                messages.push("go " + ponder_options);
                this.state.is_calculating = true;
                for (let m of messages) {
                    this._sendMessage(m);
                }
                this.current_position.fen = fen;
                this.current_position.resolve = resolve;
                this.current_position.reject = reject;
                this.ponderaction = setTimeout(()=> {
                    this.stop(); },
                 this.options.ponder_timeout+5000);        
            });
        }
    stop() {
        if (this.ponderaction) {
            clearTimeout(this.ponderaction);
            this.ponderaction = null;
        }
        this._sendMessage("stop");
    }
    quit() {
        this._sendMessage("quit");
        this.engine.quit();
    }
    clearInfo() {
        this.info = [];
    }
    handleMessage(message) {
        debug("RECV-" + this.name + ":" + message);
        if (typeof message !== 'string') {
            this.emit("unknown_message", message);
            return;
        }
        if (message.startsWith("info")) {
            this._handleInfo(message);
        } else if (message.startsWith("bestmove") && !this.handling_best_move) {
            this.handling_best_move = true;

            //this.state.is_calculating = false;
            this.info.push({
                raw: message
            });

            if (this.ponderaction) {
                clearTimeout(this.ponderaction);
            }
            let match = message.match(/bestmove (\w+)/);
            this.is_calculating = false;
            this.current_position.best_move = match[1];
            let move_lines = this.getLinesForMove(this.current_position.best_move);
            this.send_best_move();
        } else if (message.startsWith("readyok")) {
            this.emit("isready");
            return;
        } else {
            this._handleInitMessages(message);
        }
    }
    send_best_move() {
        return this.current_position.resolve(this.current_position.best_move);
    }
    _handleInfo(message) {
        let info = {
            raw: message,
            data : parse_info_message(message)
        }
        this.info.push(info);
        this.is_calculating = true;

        if (info.data.multipv) {
            let line = info.data.multipv -1;
            this.current_stats.lines[line] = {
                 pv:  info.data.pv, 
                 score: info.data.score 
                };
            this.emit("line", (line, this.current_stats.lines[line]))
        } else if (info.data.pv && this.current_stats.lines.length < 2) {
            
            this.current_stats.lines[0] = {
                pv:  info.data.pv, 
                score: info.data.score 
               };
            this.emit("line", (0, this.current_stats.lines[0]))
        }
        for (let key of Object.keys(info.data)) {
            if (key === 'multpv' || key === 'pv' || key === 'score') {
                continue;
            }      
            this.current_stats[key] = info.data[key];
        }
        //console.log("info-" + this.name, info);
        this.emit("info", info);
    }
    _handleInitMessages(message) {
        if (message.startsWith("uciok")) {
            this.state.initialized = true;
            this.emit('initialized');
        }
        if (message.startsWith("id")) {
            if (message.startsWith("id author ")) {
                this.engine_info.author = message.match(/id author (.+)/)[1];
            }
            if (message.startsWith("id name ")) {
                this.engine_info.author = message.match(/id name (.+)/)[1];
            }
        }
        if (message.startsWith("option")) {
            try {
                let option = UCIEngineOption.fromMessage(message);
                this.engine_info.options[option.name] = option;
            } catch (e) {
                this.emit('error', e);
            }
        }
        if (message.startsWith("copyprotection")) {
            this.engine_info.copyprotection = message.match(/copyprotection (\w+)/)[1];

        }
        if (message.startsWith("registration")) {
            this.engine_info.registration = message.match(/registration (\w+)/)[1];
            if (this.engine_info.registration === 'error') {
                this._sendMessage()
            }
        }
    }
    getLinesForMove(move) {
        let l = [];
        for (let line of this.current_stats.lines) {
            if (line && line.pv) {
                //console.log("line.pv", line.pv);
                let match = line.pv.startsWith(move);
                if (match) {
                    l.push(line);
                }
            }
        }
        return l;
    }
}

module.exports = UCIEngineManager;

function extract_option(message, param, options) {
    if (param === 'name') {
        let regex = new RegExp(param + '\\s' + '(.+)\\stype');
        let match = message.match(regex);
        if (match) {
            options[param] = match[1];
        }
    }
    if (param === 'var') {
        let regex = new RegExp(param + '\\s' + '(\\w+(\\sHash)?)', 'g');
        let match = message.match(regex);
        if (match) {
            match.shift();
            let results = new Set();
            for (let m of match) {
                regex = new RegExp(param + '\\s' + '(\\w+(\\sHash)?)');
                let submatch = m.match(regex);
                if (submatch) {
                    results.add(submatch[1]);
                }
            }
            options[param] = results;
        }
    } else {
        let regex = new RegExp(param + '\\s' + '(\\w+(\\sHash)?)');
        let match = message.match(regex);
        if (match) {
            options[param] = match[1];
        }
    }
}


const UCI_TYPES = new Set();
UCI_TYPES.add("check");
UCI_TYPES.add("spin");
UCI_TYPES.add("combo");
UCI_TYPES.add("button");
UCI_TYPES.add("string");

let UCI_INFO = new Set();
UCI_INFO.add("depth");
UCI_INFO.add("seldepth");
UCI_INFO.add("time");
UCI_INFO.add("nodes");
UCI_INFO.add("pv");
UCI_INFO.add("multipv");
UCI_INFO.add("score");
UCI_INFO.add("currmove");
UCI_INFO.add("currmovenumber");
UCI_INFO.add("hashfull");
UCI_INFO.add("nps");
UCI_INFO.add("tbhits");
UCI_INFO.add("cpuload");
UCI_INFO.add("string");
UCI_INFO.add("refutation");
UCI_INFO.add("currline");

function make_ponder_options_string(options, max_movetime) {
    let options_options = [];
    if (options.searchmoves) {
        if (typeof options.searchmoves === 'object' && Array.isArray(options.searchmoves) ) {
            options_options.push("searchmoves " + options.searchmoves.join(" "));
        }
    }
    if (options.wtime) {
        options_options.push("wtime " + options.wtime)
    }
    if (options.btime) {
        options_options.push("btime " + options.btime);
    }
    if (options.winc) {
        options_options.push("winc " + options.winc);
    }
    if (options.binc) {
        options_options.push("binc " + options.binc); 
    }
    if (options.movestogo) {
        options_options.push("movestogo " + options.movestogo); 
    }
    if (options.depth) {
        options_options.push("depth " + options.depth); 
    }
    if (options.nodes) {
        options_options.push("nodes " + options.nodes); 
    }
    if (options.mate) {
        options_options.push("mate " + options.mate); 
    }
    if (options.movetime < max_movetime ) {
        options_options.push("movetime " + options.movetime);
    } else {
        options_options.push("movetime " + max_movetime);
    }
    return options_options.join(" ");
}


class UCIEngineOption {
    static fromMessage(message) {
        let option = new UCIEngineOption();
        extract_option(message, 'name', option);
        extract_option(message, 'type', option);
        extract_option(message, 'var', option);
        extract_option(message, 'min', option);
        extract_option(message, 'max', option);
        extract_option(message, 'default', option);
        return option;
    }
    constructor() {
        this._data = {};
    }
    set name(name) {
        this._data.name = name;
    }
    get name() {
       return this._data.name;
    }
    set type(type) {
        if (UCI_TYPES.has(type)) {
            this._data.type = type;
        } else {
            throw new Error("Invalid type", type);
        } 
    }
    get type() {
        return this._data.type;
    }
    set default(value) {
        this._data.default = value;
    }
    get default() {
        return this._data_default;
    }
    set var(value) {
        this._data.var = value;
    }
    get var() {
        return this._data.var;
    }
    set min(value) {
        this._data.min = parseInt(value);
    }
    get min() {
        return this._data.min;
    }
    set max(value) {
        this._data.max = parseInt(value);
    }
    get max() {
        return this._data.max;
    }
    set value(value) {
        if (this.type === 'check') {
            if (value) {
                this._value = true;
            } else {
                this._value = false;
            }
        } else if (this.type === 'spin') {
            if (this._data.min < value && this._data.max >= value) {
                this._value = value;
            } else {
                throw new Error("Invalid Spin value " + value + " must be > "  + this._data.min + " " + this._data.max );
            }
        } else if (this.type === 'combo') {
            if (this.var && this.var.has(value)) {
                this._value = value;
            } else {
                throw new Error("Invalid combo value " + value + " allowed only " + this.var + "]")
            }
        } else if (this.type === 'button') {

        } else if (this.type === 'string') {
            this._value = value;
        }
    }
    get value() {
        return this._value;
    }

    generateMesssage() {
        let message = "setoption name " + this.name;
        if (this.type !== 'button') {
            message +=  " value " + this.value;
        }
        return message;
    }
}

function parse_info_message(message) {
    let words = message.split(" ");
    let current_type;
    let info = {};
    let values = [];
    for (let word of words) {
        if (word === 'info') {
            continue;
        }
        if (UCI_INFO.has(word)) {
            if (current_type) {
                info[current_type] = values.join(" ");
            }
            values= [];
            current_type = word;
        } else {
            values.push(word)
        }
    }
    if (current_type) {
        if (current_type) {
            info[current_type] = values.join(" ");
        }
    }
    return info;
}
},{"./abstract-engine-manager.js":33,"debug":53,"events":6,"stream":27}],37:[function(require,module,exports){
"use strict";
const debug = require("debug")("XBoard");
const AbstractEngineManager = require("./abstract-engine-manager.js");
//See https://www.gnu.org/software/xboard/engine-intf.html

class XBoardEngineManager extends AbstractEngineManager {
    constructor(engine, options) {
        super(engine, options);
        this.options = {};
        let ponder_timeout = 30000;
        if (options.ponder_timeout) {
            ponder_timeout = options.ponder_timeout;
        }
        this.options.ponder_timeout = ponder_timeout;
        this.engine_state = {
            initialized : false,
            analyzing : false
        };
        this.engine.on("close", (code)=>{
            this.emit("exit");
        });
        this.engine_features = {};
        this._sendMessage("xboard");
        this._sendMessage("protover 2");
        setTimeout(()=>{ 
            this.emit("initialized");
            this.engine_state.initialized = true;
        }, 1000); //give it time to respond 
    }
    async ponderPosition(fen, options) {
        return new Promise( (resolve, reject)=> {
            this._clear_stats();

            this.current_position = {
                fen : fen,
                resolve : resolve,
                reject : reject 
            };
            let messages = ["hard", "new"];
            messages.push("setboard " + fen);
            if (fen.split(" ")[1]=='b') {
                messages.push("black");
            }
            messages.push("analyze");
            messages.push("post");
            messages.push("eval");
            this.engine_state.analyzing = true; 
            for (let message of messages) {
                this._sendMessage(message);
            }
            this.ponderaction = setTimeout(()=> {
                this.end_analysis(); },
             this.options.ponder_timeout+5000); 
        });
    }
    end_analysis() {
        this._sendMessage("nopost");
        this.engine_state.analyzing = false;
        setTimeout(()=> {
            this.emit("bestmove", this.best_move.move);
            if (this.current_position.resolve) {
                this.current_position.resolve(this.best_move.move);
                
            }
        }, 500);
    }
    _clear_stats() {
        this.current_stats = { lines : [] };  
        this.best_move = {
            score : null,
            move : "",
            pv : "",
            ply : 0,
        };
    }
    handleMessage(message) {
        debug("RECV", message);
        let parsed = message.match(/(\w+)\s?(\(\d+\))\s?:\s+(.+)/);
        let side = "";
        let ply = "";
        let local_message ="";
        if (parsed) {
            this.current_side = side === 'White' ? 'w' : 'b';
            side = parsed[1];
            ply = parsed[2];
            local_message = parsed[3];
        } else {
            local_message = message;
        }
        local_message = local_message.trim();
        if (local_message.startsWith("feature")) {
            return this._handleFeatures(local_message.substring("features".length, local_message.length));
        }
        if (this.engine_state.analyzing && local_message.match(/^\s?\d/)) {
            //starts with a digit ion analysis mode
            this._handleAnalysis(local_message);
        }
    }
    _handleFeatures(message) {
        
        let features = [];
        let in_word = false;
        let in_quotes = false;
        let word = "";
        for (let char of message.split("")) {
            if (!in_word) {
                if (char !== ' ' && char !== '=') {
                    in_word = true;
                    if (char === '"') {
                        in_quotes = true;
                    } else {
                        word += char;
                    }   
                }
             } else {
                let end =  (!in_quotes && char.match(/\s/));
                if (char === '=' || char === '"' || end) {
                    if (char === '"') {
                        in_quotes = false;
                    }
                    in_word = false;
                    features.push(word.toString());
                    word = "";
                    //end word
                } else {
                    word += char;
                }
            } 
        }
        features.push(word); // put the last word in.
        for (let i = 0; i < features.length; i += 2) {
            let key = features[i];
            let value = features[i+1];
            if (!key) {
                continue;
            }
            if (this.engine_features[key] && typeof this.engine_features[key] === "string") {
                let v1 = this.engine_features[key];
                this.engine_features[key] = [v1, value];             
            } else if (this.engine_features[key] && typeof this.engine_features[key] === "object"){
                this.engine_features[key].push(value);
            } else {
               this.engine_features[key] = value;
            }
        }
    }
    _handleAnalysis(message) {
        let info = {};
        let r = [];
        if (message.includes("\t")) {
            let p = message.split("\t");
            r = p[0].split(' ');
            info.ply = parseInt(r[0]);
            info.score = parseInt(r[1]);
            info.time = r[2];
            info.nodes = r[3];
            info.selective_depth = r[4];
            info.speed = r[5];
            info.reserved = r[6];
            info.tbhits = r[7];
            info.pv = p[1];
        } else {
            r = message.split(/\s+/);
            info.ply = parseInt(r[0]);
            info.score = parseInt(r[1]);
            info.time = r[2];
            info.nodes = r[3];
            info.pv = r.slice(4).join(" ");
        }
        console.log(JSON.stringify(info, null, ' '));
        let eval_score = info.score;
        if (this.current_side === 'b') {
            eval_score = Math.abs(eval_score);
        }
        if (this.best_move.ply < info.ply) {
            this.best_move.ply = info.ply;
           
            this.best_move.move =  extract_move(info.pv);
            this.best_move.score = eval_score;
            this.best_move.pv = info.pv;
        } else if (this.best_move.ply === info.ply && this.best_move.score < eval_score) {
            this.best_move.ply = info.ply;
            this.best_move.move =  extract_move(info.pv);
            this.best_move.score = eval_score;
            this.best_move.pv = info.pv;
        }
        this.emit("line", info);
        this.current_stats.lines.push(info);
    }
    quit() {
        this._sendMessage("quit");
        super.quit()
    }
}
function extract_move(pv) {
    if (pv.startsWith("1.")) {
        //crafty style pv
        let moves = pv.match(/\d\.\s([\w\.]+)\s(\w+)/);
        if (moves) {
            if (moves[1] == '...') {
                return moves[2];
            } else {
                return moves[1];
            }
        }
    } else {
        return pv.split(" ")[0]
    }
    
}
module.exports=XBoardEngineManager;
},{"./abstract-engine-manager.js":33,"debug":53}],38:[function(require,module,exports){
(function (process){
"use strict";
const Chess = require('chess.js').Chess

/*
See https://chessprogramming.wikispaces.com/Extended+Position+Description
*/
function getIntValue(value) {
    return parseInt(value.trim());
}
function getMoves(value) {
    let moves = [];
    let vs = value.split(" ");
    for (let v of vs) {
        if (v) {
            if (v === 'O-O-O' || v === 'O-O' || v.match(/[abcdefghrbknqpx1-8]+[\+\?!]*/i)) {
              if (v.match(/[^RBKNQPabcdefghrbknqpx1-8\+\?!]/)) {
                //this is not a move skip it.
              } else {
                moves.push(v);
              }
            } else {
                console.log("Unknown value for move", v);
            }
        }
    }
    return moves;
}

function getText(value) {
    let output = value.trim();
    output = output.replace(/"/g, "");
    return output;
}
function getTrue() {
    return true;
}

const OPCODES = {
    'acn' : getIntValue,
    'acs' : getIntValue,
    'am' : getMoves,//avoid moves
    'bm' : getMoves, //best moves,
    'ce' : getIntValue,
    'dm' : getIntValue,
    'draw_accept' : getTrue,
    'draw_offer' : getTrue,
    'draw_reject' : getTrue,
    'eco' : getText,
    'fmvn' : getIntValue,
    'hmvc' : getIntValue,
    'nic' : getText,
    'noop' : getText,
    'pm' : getMoves,
    'pv' : getText,
    'rc' : getIntValue,
    'resign' : getTrue,
    'sm' : getMoves,
    'tcgs' : getIntValue,
    'tcri' : getText,
    'v0' : getText,
    'v1' : getText,
    'v2' : getText,
    'v3' : getText,
    'v4' : getText,
    'v5' : getText,
    'v6' : getText,
    'v7' : getText,
    'v8' : getText,
    'v9' : getText,

}

class EPDEntry {
    static fromLine(line) {
        let position = new EPDEntry();
        let elements = line.split(";");
        let fen_elements = elements[0].split(" ");
        let fen = fen_elements.slice(0,4).join(" ");
        position.fen = fen + " 0 1";
        elements[0] = fen_elements.slice(4).join(" ");
        for (let element of elements) {
            let em = element.trim().match(/(\w+)\s+(.+)/);
            let command = em[1];
            let value = em[2];
            if (command === 'id') {
                position.id = getText(value);
            } else if (command.match(/c\d/)) {
                let num = parseInt(command.substring(1,command.length));
                position.comments[num] = getText(value); 
            } else if (OPCODES[command]) {
                position.operations[command] = OPCODES[command](value);
            } else {
                console.log("Invalid command", command);
                console.log("Value is", value);
            }

        }
        return position;
    }
    constructor() {
        this.fen = "";
        this.id = "";
        this.operations = {};
        this.comments = [];
    }
    toChess() {
        let chess = new Chess();
        if (!chess.load(this.fen)) {
            console.log("unable to load fen", this.fen);
            process.exit();
        }   
        console.log(chess.fen())
        return chess;
    }
    get best_move() {
        return this.operations.bm;
    }
}
module.exports=EPDEntry;
}).call(this,require('_process'))
},{"_process":12,"chess.js":52}],39:[function(require,module,exports){
(function (__dirname){
const EventEmitter = require('events');
const EPDEntry = require("./entry.js");
const Transform = require("stream").Transform;
const utils = require(__dirname + '/../utils.js');
class EPDStream extends Transform {
    constructor() {
        super({ readableObjectMode: true });
        this._lines = [];
    }
    _flush(callback) {
        this._make_records_from_lines();
        callback();
    }
    _transform(chunk, encoding, callback) {
        let data = chunk.toString();
        let lines = data.split(/\n/m);
        if (this._lines.length > 0) {
          this._lines[this.lines.length - 1] += lines.shift();
        }
        for (let line of lines) {
          this._lines.push(line);
        }
        this._make_records_from_lines();
        callback();
      }
      _make_records_from_lines() { 
        let len = this._lines.length;
        for (let i = 0; i < len; i++) {
         
          let line = this._lines.shift();
          if (line) {
            let entry = EPDEntry.fromLine(line);
            this.push(entry);
          }
        }
      }
}
class EPD extends EventEmitter {
    constructor() {
        super();
        this.loaded = false;
        this.entries = [];
        this.stream = new EPDStream();

    }
    load_stream(stream) {
        this.stream.on("finish", () => {
          this.loaded = true;
          this.emit("loaded");
        });
        this.stream.on("data", (entry) => {
          this.entries.push(entry);
        });
        stream.pipe(this.stream);
    }
    find(fen) {
        if (!this.loaded) {
            throw new Error("EPD not loaded")
        }
        let match_key = utils.key_from_fen(fen);
        let entries = [];
        for (let entry of this.entries) {
          
            if (utils.key_from_fen(entry.fen) == match_key) {
                entries.push(entry);
            }
        }
        return entries;
    }
}
module.exports = EPD
}).call(this,"/../../node_modules/chess-tools/epd")
},{"./entry.js":38,"events":6,"stream":27}],40:[function(require,module,exports){
"use strict";
const OpeningBooks = require("./opening-books/index.js");
const ECO = require("./eco/index.js");
const EPD = require("./epd/index.js");
const Engines = require("./engines/index.js");
module.exports = {
  'OpeningBooks' : OpeningBooks,
  'ECO' : ECO,
  'EPD' : EPD,
  'Engines' : Engines
}

},{"./eco/index.js":32,"./engines/index.js":35,"./epd/index.js":39,"./opening-books/index.js":47}],41:[function(require,module,exports){
"use strict";
const utils  = require('../../utils.js');
const files = utils.board.FILES;
const Chess = require('chess.js').Chess;
function decode_move(pos) {
    let file_num = pos % 8;
    let rank = parseInt(pos/8) + 1;
    return files[file_num] + "" + rank;
}
function decode_promotion(promotion) {
    if (!promotion) {
        return "";
    }
    switch(promotion) {
        case 1:
            return 'r';
            break;
        case 2:
            return 'n';
            break;
        case 3: 
            return 'b';
            break;
        case 4: 
            return 'q';
            break;
        default:
            return false;
    }
}

class ABKEntry {
       // Everything is little endian because reasons
        // c byte alignment applies so the structure is 28
        // struct BOOK { 
        //     unsigned char move_from; //1 byte
        //     unsigned char move_to; // 1 byte
        //     unsigned char move_promo; //1 byte
        //     unsigned char priority; //1 byte
        //     unsigned int games; //4 bytes
        //     unsigned int won_games; // 4 bytes
        //     unsigned int lost_games; //4 bytes
        //     unsigned int hz; //4 bytes
        //     int first_child; //4 bytes
        //     int next_sibling; //4 bytes
        //   } *book; 
    static fromBuffer(buffer, address, parent) {
        let entry = new ABKEntry();
        entry.address = address;
        entry.move_from = decode_move(buffer.readInt8(0));
        entry.move_to = decode_move(buffer.readInt8(1));
        entry.move_promo = buffer.readInt8(2);
        entry.priority = buffer.readInt8(3);
        entry.games = buffer.readUInt32LE(4);
        entry.won_games  = buffer.readUInt32LE(8);
        entry.lost_games = buffer.readUInt32LE(12);
        entry.ply_count = buffer.readUInt32LE(16);
        entry.first_child = buffer.readInt32LE(20);
        entry.next_sibling = buffer.readInt32LE(24);
        return entry;
    }
    constructor() {
        this.children = [];
        this.path = [];
    }
    toChess() {
        let chess = new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        for (let p of this.path) {
    
            chess.move(p.current_move_raw, {sloppy: true});
        }
        chess.move(this.current_move_raw, {sloppy: true});
        return chess;
    }
    get current_move() {
        let history = this.toChess().history();
        return history[history.length-1];
    }
    get current_move_raw() {
        let move = this.move_from + "" + this.move_to;
                // let move = { from: p.move_from, to: p.move_to, sloppy : true }
            // if (p.move_promo) {
            //     move.flags = 'p';
            //     move.peice = p.move_promo;
            // }
        if (this.move_promo) {
            move += this.move_promo;
        }
        return move;
    }
    get fen() {
        if (!this._fen) { 
           this._fen = this.toChess().fen();
        }
        return this._fen;
    }
    get book_moves() {
       return this.children;
    }
    toPGN() {
        return this.toChess().pgn();
    }
}
module.exports = ABKEntry;
},{"../../utils.js":51,"chess.js":52}],42:[function(require,module,exports){
(function (Buffer){
"use strict";
//see https://chessprogramming.wikispaces.com/ABK
//http://www.talkchess.com/forum/viewtopic.php?topic_view=threads&p=184321&t=20661
const debug = require('debug')('ABK');
const utils  = require('../../utils.js');
const Transform = require('stream').Transform;
const EventEmitter = require('events');
const ENTRY_SIZE= 28; //bytes
const START_ADDRESS = ENTRY_SIZE * 900;
const Chess = require('chess.js').Chess;
//var chess = new Chess();
const files = utils.board.FILES;
const ABKEntry = require("./entry.js");
class ABKStream extends Transform {
    constructor() {
        super({readableObjectMode: true});
        this.start = 900 * ENTRY_SIZE;
        this.last_read = this.start;
        this.entry_num = 0;
        this.current_depth = 0;
        this.current_address = 900;
        this.read_to_start = false;
        this.received_bytes = 0;
        this.can_read = true;
        this.current_path = [];
    }
    _flush(callback) {
        callback();
    }
    _transform(chunk, encoding, callback) {
        this.received_bytes += chunk.length;
        if (this._data) {
            this._data = Buffer.concat([this._data, chunk]);
        } else {
            this._data = chunk;
        }
        if (this.received_bytes > this.start + ENTRY_SIZE) {
            this.read_to_start = true;
        }
        if (this.read_to_start) {
            let t0 = new Date().getTime();
            while(this.can_read == true) {
                this.read_record();
            }
            let t3 = new Date().getTime();
        }
        callback();
    }
    read_record() {
        let offset = ENTRY_SIZE * this.entry_num;
        let record = this._data.slice(START_ADDRESS + offset, START_ADDRESS + ENTRY_SIZE + offset);
        this.last_read = START_ADDRESS + offset;
        let entry = ABKEntry.fromBuffer(record, this.entry_num + 900);
        if (this.current_path.length > 0 ) {
            this.current_path[this.current_path.length-1].children.push(entry);
            for (let p of this.current_path) {
                entry.path.push(p);
            }
            if (entry.first_child > -1 ) {
                this.current_path.push(entry);
            } else if (entry.first_child === -1 && entry.next_sibling === -1) {
                let remove = 0;
                for (let p of this.current_path) {
                    if (p.next_sibling === -1) {
                        remove++;
                    }
                }
                this.current_path = this.current_path.slice(0, this.current_path.length - remove);
            } else {

            }
        } else {
            this.current_path = [entry];
        }
        this.entry_num++;
        entry.entry_num = this.entry_num;
        this.push(entry);
        this.can_read = (this._data.length > START_ADDRESS + ENTRY_SIZE + offset + ENTRY_SIZE);
    }
    push(e) {

        super.push(e);
    }
}
class ABK extends EventEmitter {
    constructor() {
        super();
        this.entries = {};
        this.stream = new ABKStream();
    }
    load_book(stream) {
        this.entries = [];
        this.loaded = false;
        this.stream.on("data", (entry)=>{ 
            let key = utils.key_from_fen(entry.fen);
            if (this.entries[key]) {
                this.entries[key].push(entry);
            } else {
                this.entries[key] = [ entry ];
            }
        });
        this.stream.on('finish', ()=>{
            this.loaded= true;
            this.emit("loaded");
        });
        this.stream.on('error', (error)=>{
          console.log("error", error);
          this.emit("error", error);
        });
        stream.pipe(this.stream);
      }
    find(fen) {
        let key = utils.key_from_fen(fen);
        return this.entries[key];
    }
}

module.exports=ABK;
}).call(this,require("buffer").Buffer)
},{"../../utils.js":51,"./entry.js":41,"buffer":4,"chess.js":52,"debug":53,"events":6,"stream":27}],43:[function(require,module,exports){
"use strict";
const Chess = require('chess.js').Chess;
const chess = new Chess();
module.exports.peice_encoding = {
    '0' :     { txt : ' ', type : null, color : null },
   '110' :    { txt : 'P', type : chess.PAWN, color : chess.WHITE },
   '10110' :  { txt : 'R', type : chess.ROOK, color : chess.WHITE},
   '10100' :  { txt : 'B', type : chess.BISHOP, color : chess.WHITE},
   '10010' :  { txt : 'N', type : chess.KNIGHT, color : chess.WHITE},
   '100010' : { txt : 'Q', type : chess.QUEEN, color : chess.WHITE},
   '100000' : { txt : 'K', type : chess.KING, color : chess.WHITE},
   '111' :    { txt : 'p', type : chess.PAWN, color : chess.BLACK},
   '10111' :  { txt : 'r', type : chess.ROOK, color : chess.BLACK},
   '10101' :  { txt : 'b', type : chess.BISHOP, color : chess.BLACK},
   '10011' :  { txt : 'n', type : chess.KNIGHT, color : chess.BLACK},
   '100011' : { txt : 'q', type : chess.QUEEN, color : chess.BLACK},
   '100001' : { txt : 'k', type : chess.KING, color : chess.BLACK}
  };
 module.exports.peice_encoding_black = {
    '0' :     { txt : ' ', type : null, color : null},
    '110' :    { txt : 'p', type : chess.PAWN, color : chess.BLACK },
    '10110' :  { txt : 'r', type : chess.ROOK, color : chess.BLACK },
    '10100' :  { txt : 'b', type : chess.BISHOP, color : chess.BLACK },
    '10010' :  { txt : 'n', type : chess.KNIGHT, color : chess.BLACK },
    '100010' : { txt : 'q', type : chess.QUEEN, color : chess.BLACK },
    '100000' : { txt : 'k', type : chess.KING, color : chess.BLACK },
    '111' :    { txt : 'P', type : chess.PAWN, color : chess.WHITE },
    '10111' :  { txt : 'R', type : chess.ROOK, color : chess.WHITE },
    '10101' :  { txt : 'B', type : chess.BISHOP, color : chess.WHITE },
    '10011' :  { txt : 'N', type : chess.KNIGHT, color : chess.WHITE },
    '100011' : { txt : 'Q', type : chess.QUEEN, color : chess.WHITE },
    '100001' : { txt : 'K', type : chess.KING, color : chess.WHITE },
  }

module.exports.flip_ep_column = [
    0x07,
    0x06,
    0x05,
    0x04,
    0x03,
    0x02,
    0x00
  ];
module.exports.castle_encoding = [
    { code : 0x02, value : 'K'},
    { code : 0x01, value : 'Q'},
    { code : 0x8, value: 'k' },
    { code : 0x04, value : 'q'}
  ];
 module.exports.en_passant_encoding = [
    { code : 0x00 , value : 'a6' },
    { code : 0x01 , value : 'b6' },
    { code : 0x02 , value : 'c6' },
    { code : 0x03 , value : 'd6' },
    { code : 0x04 , value : 'e6' },
    { code : 0x05 , value : 'f6' },
    { code : 0x06, value : 'g6' },
    { code : 0x07 , value : 'h6' }
  ];
 module.exports.en_passant_encoding_black = [
    { code : 0x00 , value : 'a4' },
    { code : 0x01 , value : 'b4' },
    { code : 0x02 , value : 'c4' },
    { code : 0x03 , value : 'd4' },
    { code : 0x04 , value : 'e4' },
    { code : 0x05 , value : 'f4' },
    { code : 0x06, value : 'g4' },
    { code : 0x07 , value : 'h4' }
  ]
module.exports.ep_mask = parseInt('11100000', 2);
module.exports.castle_mask = parseInt('00011110',2);
module.exports.po = 0x1f;
module.exports.ep = 0x20;
module.exports.ca = 0x40;
},{"chess.js":52}],44:[function(require,module,exports){
(function (__dirname){
"use strict";
const Chess = require("chess.js");
const {peice_encoding, peice_encoding_black, flip_ep_column, castle_encoding,en_passant_encoding,en_passant_encoding_black,ep_mask, castle_mask, po, ep, ca } = require("./encoding.js");
var utils = require(__dirname + '/../../utils.js');
class CTGEntry {
    constructor(to_move) {
      if (!to_move) {
        this.to_move = 'w';
      } else {
        this.to_move = to_move;
      }
      this.book_moves = [];
      this.ratings = [];
      this.total_games = 0;
      this.white_wins = 0;
      this.black_wins = 0;
      this.draws = 0;
      this.unknown1;
      this.unknown2;
      this.is_mirrored = false;
      
    }
    toChess() {
      let chess = new Chess(this.fen);
      return chess;
    }
    setFen(fen) {
      if (this.has_castling) {
        let castle_string = "";
        for (let encoding of castle_encoding) {
          if (this.castling_data & encoding.code) {
            castle_string += encoding.value;
          }
        }
        fen = fen.replace("-", castle_string);
      }
      if (this.has_en_passant) {
        let ep_coding = this.to_move === 'w' ? en_passant_encoding : en_passant_encoding_black;
        for (let coding of ep_coding) {
          if (coding.code & this.en_passant_data) {
            let fen_items = fen.split(" ");
            fen_items[3] = coding.value;
            fen = fen_items.join(" ");
          }
        }
      }
      if (this.to_move === 'b') {
        let fen_items = fen.split(" ");
        fen_items[1] = 'b';
        fen = fen_items.join(" ");
      }
      this._fen = fen;
      this.key = utils.key_from_fen(fen);
    }
    get fen() {
      return this._fen;
    } 
    toPGN() {
      throw new Error("PGN not available");
    }
    toString() {
      return JSON.stringify(this, null, '');
    }
  }
  module.exports=CTGEntry;
}).call(this,"/../../node_modules/chess-tools/opening-books/ctg")
},{"./encoding.js":43,"chess.js":52}],45:[function(require,module,exports){
(function (process,Buffer,__dirname){
"use strict";
var debug = require('debug')('CTG');
var utils = require(__dirname + '/../../utils.js');
const CTGEntry = require("./entry.js");
//Based on notes  from http://rybkaforum.net/cgi-bin/rybkaforum/topic_show.pl?tid=2319
const Transform = require('stream').Transform;
const EventEmitter = require('events');
const Chess = require('chess.js').Chess;
const chess = new Chess();
const chess_black = new Chess();
const files = utils.board.FILES;
const ranks = utils.board.RANKS;
const board_index = utils.board.BOARD_INDEX;
const flip_board = utils.board.FLIP_BOARD;
const mirror_file = utils.board.MIRROR_FILE;
const CTGMoveService = require("./moves.js");
const moveService = new CTGMoveService();
const {peice_encoding, peice_encoding_black, flip_ep_column, castle_encoding,en_passant_encoding,en_passant_encoding_black,ep_mask, castle_mask, po, ep, ca } = require("./encoding.js");
class CTGStream extends Transform {
  constructor() {
    super({readableObjectMode : true });
    this.page = -1;
    this.entry_num = 0;
  }
  _flush(callback) {
    callback();
  }
  _transform(chunk, encoding, callback) {
    if (this._data) {
      this._data = Buffer.concat(this._data, chunk);
    } else {
      this._data = chunk;
    }
    let dataview = new DataView(this._data.buffer);
    if (this.page === -1) {
      if (this._data.length > 32 && typeof this.number_of_games === 'undefined') {
        this.number_of_games = dataview.getUint32(28);
        // console.log("Number of Games", this.number_of_games);
      }
      if (this._data.length >= 4096) {
        this.page++;
        this._data =  Buffer.from(this._data.buffer.slice(4096, this._data.length));
        dataview = new DataView(this._data.buffer);
      }
    }
    if (this.page > -1 && this._data.length >= 4096) { 
      //we have pages.
      let num_pages = parseInt(this._data.length / 4096);
      //  console.log("Got " + num_pages + " pages", this._data.length );
      let remainder = this._data.length % 4096;
      //  console.log("remainder length is", remainder);
      let extra_data;
      if (remainder > 0) {
        extra_data = new Buffer(this._data.buffer.slice(this._data.buffer.length - remainder, this._data.buffer.length));
      }
      for (let page_num = 0 ; page_num < num_pages; page_num++) {

        this.process_page(page_num, dataview);
      }
      this._data = extra_data;
    }
    callback();
  }
  process_page(page_num, dataView) {
    this.page++;
      let page_start = page_num * 4096;
      let number_of_positions = dataView.getUint16(page_start);
      let bytes_in_page = dataView.getUint16(page_start+2);
      // console.log("Page Start", page_start, page_start + bytes_in_page)
      let page = this._data.buffer.slice(page_start, page_start + bytes_in_page);
      let pageView = new DataView(page);
      // console.log("Page Len", page);
      // console.log("page", this.page, "number_of_positions", number_of_positions);
      //  console.log("page", this.page, "bytes_in_page", bytes_in_page);
      this.record_start = 4;
      this.last_record_start =4;
      for (let pos = 0; pos < number_of_positions; pos++) {
        this.process_entry(pos, page, pageView);
      }
  }
  process_entry(pos, page, pageView) {
    this.entry_num++;
    let entry = new CTGEntry();
    let entry_black = new CTGEntry('b');
    entry.entry_num = this.entry_num;
    entry.page = this.page;
    entry.record_start = this.record_start;
    entry.pos = pos;
    entry_black.entry_num = this.entry_num;
    entry_black.page = this.page;
    entry_black.record_start = this.record_start;
    entry_black.pos = pos;
    this.last_record_start = this.record_start;
    let header_byte = pageView.getUint8(this.record_start);
    let position_length = header_byte & 0x1f;
    let en_passant = header_byte & 0x20;
    let castling = header_byte & 0x40;
    if (!header_byte) {
      // console.log("INVALID HEADER BYTE WTF!!!", this.record_start);
      utils.debug_buffer_to_string(page.slice(this.record_start-3, this.record_start+3));
      process.exit();
    }
    // console.log(utils.pad_number_string(header_byte.toString(2), 8));
    entry.position_length = position_length;
    // console.log("POSITION LENGTH", position_length);
    entry.has_en_passant = en_passant;
    entry.has_castling = castling;
    entry_black.position_length = position_length;
    entry_black.has_en_passant = en_passant;
    entry_black.has_castling = castling;
    let p1 = this.record_start + 1;
    let p2 = p1 + position_length;
    let position_buffer = page.slice(p1, p2);
    let position_view = new Uint8Array(position_buffer);
    let binary_string = "";
    position_view.forEach((element)=>{
      binary_string += utils.pad_number_string(element.toString(2), 8);
    });
    entry.encoded_position = binary_string;
    entry_black.encoded_position = binary_string;
    let board = [];
    let board_black = [];
    let str_position = 0;
    let max = 6;
    let rank = 0;
    let file = 0;
    let black_is_mirrored = false;
    chess.clear();
    chess_black.clear();
    POSITION_LOOP:
    for (let board_position = 0; board_position < 64; board_position++) {
      EVAL_LOOP:
      for (let str_len = 1; str_len <= max; str_len++) {
        let eval_string = binary_string.substring(str_position, str_position+str_len);
        for (let peice_code of Object.keys(peice_encoding)) {
          if (String(eval_string) === String(peice_code)) {
            if (rank == 8) {
              file++;
              rank = 0;
            }
            let algebraic_position = files[file] + "" + ranks[rank]; 
            let black_position = flip_board[algebraic_position];
            if (peice_encoding[String(peice_code)] && peice_encoding[String(peice_code)].txt !== ' ') {
              chess.put(peice_encoding[String(peice_code)], algebraic_position);
              if (peice_encoding_black[String(peice_code)].txt == 'K') {
                if (black_position.match(/[abcd]\d/)) {
                  if (!entry.has_castling) {
                    black_is_mirrored = true;
                  }
                }
              }
              chess_black.put(peice_encoding_black[String(peice_code)], black_position);
            };

            board.push({ peice: peice_encoding[String(peice_code)], position : algebraic_position });
            board_black[board_index[black_position]] = { peice: peice_encoding_black[String(peice_code)], position : black_position }
            str_position += String(peice_code).length;
            str_len=1;
            rank++;
            continue POSITION_LOOP;
          }
        }
      }
    }
    if (black_is_mirrored) {
      entry_black.is_mirrored = true;
      chess_black.clear();
      let tmp_board_black = [];
      entry_black.has_castling = 0;
      for (let position of board_black) {
        let pos_elements = position.position.split("");
        pos_elements[0] = mirror_file[pos_elements[0]];
        position.position = pos_elements.join("");
        let updated = board_index[position.position];
        tmp_board_black[updated] = position;
        if (position.peice.txt != ' ') {
          chess_black.put(position.peice, position.position);
        }
      }
      board_black = tmp_board_black;
    }

    entry.board = board;
    entry_black.board = board_black;
    this.record_start += position_length;
    if (en_passant || castling) {
      let ep_castle = pageView.getUint8(this.record_start-1);
      let ep_value = ep_castle & ep_mask;
      ep_value = ep_value >> 5;
      entry.en_passant_data = ep_value;
      entry_black.en_passant_data = black_is_mirrored ? flip_ep_column[ep_value] : ep_value;
      let castle_value = ep_castle & castle_mask;
      castle_value = castle_value >> 1;
      entry.castling_data = castle_value;
      entry_black.castling_data = castle_value;
    }
    entry.setFen(chess.fen());
    entry_black.setFen(chess_black.fen());
    let book_moves_size = pageView.getUint8(this.record_start);
    let number_book_moves = 0;
    if (book_moves_size > 0) {
      number_book_moves = ( book_moves_size - 1 ) /2;
    }
    let move_start = this.record_start + 1;
    for (let m = 0; m < number_book_moves; m++) {
      let book_move = pageView.getUint8(move_start+(m*2));
      let book_annotation = pageView.getUint8(move_start+(m*2)+1);
      let move_and_analysis = moveService.decode_move(book_move, book_annotation, board);
      let move_and_analysis_black = moveService.decode_move(book_move, book_annotation, board_black, 'b', black_is_mirrored);
      entry.book_moves.push(move_and_analysis);
      entry_black.book_moves.push(move_and_analysis_black);
    }
    this.record_start += book_moves_size;
    let num_games = read_24(pageView, this.record_start);
    entry.total_games = num_games;
    this.record_start += 3;
    let num_white_wins = read_24(pageView, this.record_start);
    entry.white_wins = num_white_wins;
    entry_black.black_wins = num_white_wins;
    this.record_start += 3;
    let num_black_wins = read_24(pageView, this.record_start);
    entry.black_wins = num_black_wins;
    entry_black.white_wins = num_black_wins;
    this.record_start += 3;
    let num_draws = read_24(pageView, this.record_start);
    entry.draws = num_draws;
    entry_black.draws = entry.draws;
    this.record_start += 3;
    let unkown_integer = pageView.getUint32(this.record_start);
    entry.unknown1 = unkown_integer
    this.record_start += 4;
    let rating1_num_games = read_24(pageView, this.record_start);
    this.record_start += 3;
    let rating1_rating_total = pageView.getUint32(this.record_start);
    let rating1_rating = rating1_rating_total/rating1_num_games;
    entry.ratings.push({ games : rating1_num_games, rating : rating1_rating, total_ratings : rating1_rating_total  });
    this.record_start += 4;
    let rating2_num_games = read_24(pageView, this.record_start);
    this.record_start += 3;
    let rating2_rating_total = pageView.getUint32(this.record_start);
    this.record_start += 4;
    let rating2_rating =   rating2_rating_total / rating2_num_games;
    entry.ratings.push({ games : rating2_num_games, rating : rating2_rating, total_ratings : rating2_rating_total  });
    entry_black.ratings = entry.ratings;
    let recommendation = pageView.getUint8(this.record_start);
    entry.recommendation = moveService.decode_analysis(recommendation);
    entry_black.recommendation;
    this.record_start += 1;
    let unknown2 = pageView.getUint8(this.record_start);
    entry.unknown2 = unknown2;
    this.record_start += 1;
    let commentary = pageView.getUint8(this.record_start);
    entry.commentary = moveService.decode_analysis(commentary);
    entry_black.commentary =  entry.commentary;
    this.record_start +=1;
    let statistics_size = 12 + 4 + 14 + 3; //stats, unknown, ratings, recommendation, commentary;
    let record_offset = ( position_length + book_moves_size + statistics_size);
    entry.record_offset = record_offset;
    entry_black.record_offset = record_offset;
    // console.log(entry.record_start, entry.record_offset);
    this.push(entry);
    this.push(entry_black);
  }
}
class CTG  extends EventEmitter {
  constructor() {
    super();
    this.loaded = false;
    this.stream = new CTGStream();
    this.entries = {
      b : {},
      w : {},
    }
  }
  load_book(stream) {
    this.stream.on( "data", (entry)=>{
      if (this.entries[entry.to_move][entry.key]) {
        console.log("possible duplicate for entry")
        console.log("New Entry:", JSON.stringify(entry, null, ' '));
        console.log("OLD ENTRY:", JSON.stringify(this.entries[entry.to_move][entry.key]));
      }
      this.entries[entry.to_move][entry.key] = entry;
    });
    this.stream.on('finish', ()=>{
        this.loaded= true;
        this.emit("loaded");
    });
    this.stream.on('error', (error)=>{
      console.log("error", error);
      this.emit("error", error);
    })
    stream.pipe(this.stream);
  }
  find(fen) {
    if (!this.loaded) {
      throw new Error("No book is loaded")
    }
    let to_move = fen.split(" ")[1];
    let key = utils.key_from_fen(fen);
    return this.entries[to_move][key];
  }
}
module.exports=CTG;
CTG.CTGStream = CTGStream;
CTG.CTGEntry = CTGEntry;


function read_24(dataview, start) {
  let byte1 = dataview.getUint8(start);
  let byte2 = dataview.getUint8(start+2);
  let byte3 = dataview.getUint8(start+4);
  let res = (byte1 << 16) + (byte2 << 8) + byte3;
  return res; 
}

}).call(this,require('_process'),require("buffer").Buffer,"/../../node_modules/chess-tools/opening-books/ctg")
},{"./encoding.js":43,"./entry.js":44,"./moves.js":46,"_process":12,"buffer":4,"chess.js":52,"debug":53,"events":6,"stream":27}],46:[function(require,module,exports){
(function (process){
"use strict";
const utils  = require('../../utils.js');
let peices = {
    'Pawn' : 'P',
    'Knight': 'N',
    'King': 'K',
    'Queen': 'Q',
    'Bishop': 'B'
};
let files = utils.board.FILES;
function algebraic_position_to_xy(algebraic) {
    let file_and_rank = algebraic.split("");
    let x;
    for (x = 0; x < 8; x++) {
        if (files[x] === file_and_rank[0]) {
            break;
        }
    }
    return {
        x : parseInt(x),
        y : parseInt(file_and_rank[1])-1
    }
}
function xy_to_algebraic_notation(xy) {
    let rank = xy.y + 1;
    let file = files[xy.x];
    return file + "" + rank;
}

class CTGMoveService {
   constructor() {

   }
   decode_move(code, analysis_code, board, is_black, is_mirrored) {
    var move;
    var start_position = "";
    var end_position = "";
    var move_notation = "";
    for (move of CTGMoveService.moves) {
        if (Number(code) === Number(move.code)) {
            break;
        }
    }
    if (move.move === 'O-O' || move.move === 'O-O-O') {
        move_notation= move.move;
    } else {
        let peice_number = move.peice.match(/([A-Za-z]+) (\d)/);
        if (peice_number) {
            let peice_short = peices[peice_number[1]];
            let peice_num = peice_number[2];
            let pn= 1;
            let i = 0;
             for (let position of board) {
                //
                if (!position || !position.peice) {
                    console.log("BOARD ERROR", is_black, is_mirrored, i, board.length);
                    console.log(JSON.stringify(board, null, ' '));
                   process.exit();
                } 
                 if (position.peice.txt === peice_short) {
                     if (pn == peice_num) {
                       start_position = position.position;
                          let move_info = move.move.match(/(\w)(\d) ?(\w?)(\d?)/);
                          if (move_info) {
                              let x_dir = 1;
                              let y_dir = 1;
                              let x = 0;
                              let y = 0;
                              if (move_info[1] === 'b') {
                                  y_dir = is_black ? 1 : -1;
                              }
                              if (move_info[1] === 'r' || move_info[3] === 'r') {
                                  x_dir = (is_black && !is_mirrored ) ? 1 :  -1;
                              }
                              if (move_info[1] === 'b' || move_info[1] === 'f') {
                                  y = move_info[2];
                              } else {
                                  x = move_info[2];
                              }
                              if (move_info[3]) {
                                  x = move_info[4];
                              }
                              x = x * x_dir;
                              y = y * y_dir;
                              let xy = algebraic_position_to_xy(start_position);
                              xy.y = xy.y + y;
                              xy.x = xy.x + x;
                              move_notation = start_position + "" + xy_to_algebraic_notation(xy);
                          }
      
                       break;
                     } else {
                       pn++;
                     }
                 }
                 i++;
             } 
          }
    }
    return { "move" : move, "analysis" : this.decode_analysis(analysis_code), "move_notation" : move_notation };
   }
   decode_analysis(analysis_code) {
    var analysis;
    for (analysis of CTGMoveService.analysis) {
        if (Number(analysis.code) === Number(analysis_code)) {
            break;
        }
    }
    return analysis;
   }

}

CTGMoveService.analysis = [
    {"code" : "0x00", "description" : "No annotation"},
    {"code" : "0x01", "description" : "!"},
    {"code" : "0x02", "description" : "?"},
    {"code" : "0x03", "description" : "!!"},
    {"code" : "0x04", "description" : "??"},
    {"code" : "0x05", "description" : "!?"},
    {"code" : "0x06", "description" : "?!"},
    {"code" : "0x08", "description" : "Only move"},
    {"code" : "0x16", "description" : "Zugzwang"},
    { "code" : "0x0b", "description" : "="},
    { "code" : "0x0d", "description" : "Unclear"},
    { "code" : "0x0e", "description" : "=+"},
    { "code" : "0x0f", "description" : "+="},
    { "code" : "0x10", "description" : "-/+"},
    { "code" : "0x11", "description" : "+/-"},
    { "code" : "0x13", "description" : "+-"},
    { "code" : "0x20", "description" : "Development adv."},
    { "code" : "0x24", "description" : "Initiative"},
    { "code" : "0x28", "description" : "With attack"},
    { "code" : "0x2c", "description" : "Compensation"},
    { "code" : "0x84", "description" : "Counterplay"},
    { "code" : "0x8a", "description" : "Zeitnot"},
    { "code" : "0x92", "description" : "Novelty"}
];


CTGMoveService.moves= [
    { "code" : "0x00", "peice": "Pawn 5", "move": "f1 r1" },
    { "code" : "0x01", "peice": "Knight 2", "move": "b1 l2" },
    { "code" : "0x03", "peice": "Queen 2", "move": "r2" },
    { "code" : "0x04", "peice": "Pawn 2", "move": "f1" },
    { "code" : "0x05", "peice": "Queen 1", "move": "f1" },
    { "code" : "0x06", "peice": "Pawn 4", "move": "f1 l1" },
    { "code" : "0x08", "peice": "Queen 2", "move": "r4" },
    { "code" : "0x09", "peice": "Bishop 2", "move": "f6 r6" },
    { "code" : "0x0a", "peice": "King ", "move": "b1" },
    { "code" : "0x0c", "peice": "Pawn 1", "move": "f1 l1" },
    { "code" : "0x0d", "peice": "Bishop 1", "move": "f3 r3" },
    { "code" : "0x0e", "peice": "Rook 2", "move": "r3" },
    { "code" : "0x0f", "peice": "Knight 1", "move": "b1 l2" },
    { "code" : "0x12", "peice": "Bishop 1", "move": "f7 r7" },
    { "code" : "0x13", "peice": "King ", "move": "f1" },
    { "code" : "0x14", "peice": "Pawn 8", "move": "f1 r1" },
    { "code" : "0x15", "peice": "Bishop 1", "move": "f5 r5" },
    { "code" : "0x18", "peice": "Pawn 7", "move": "f1" },
    { "code" : "0x1a", "peice": "Queen 2", "move": "f6" },
    { "code" : "0x1b", "peice": "Bishop 1", "move": "f1 l1" },
    { "code" : "0x1d", "peice": "Bishop 2", "move": "f7 r7" },
    { "code" : "0x21", "peice": "Rook 2", "move": "r7" },
    { "code" : "0x22", "peice": "Bishop 2", "move": "f2 l2" },
    { "code" : "0x23", "peice": "Queen 2", "move": "f6 r6" },
    { "code" : "0x24", "peice": "Pawn 8", "move": "f1 l1" },
    { "code" : "0x26", "peice": "Bishop 1", "move": "f7 l7" },
    { "code" : "0x27", "peice": "Pawn 3", "move": "f1 l1" },
    { "code" : "0x28", "peice": "Queen 1", "move": "f5 r5" },
    { "code" : "0x29", "peice": "Queen 1", "move": "r6" },
    { "code" : "0x2a", "peice": "Knight 2", "move": "b2 r1" },
    { "code" : "0x2d", "peice": "Pawn 6", "move": "f1 r1" },
    { "code" : "0x2e", "peice": "Bishop 1", "move": "f1 r1" },
    { "code" : "0x2f", "peice": "Queen 1", "move": "r1" },
    { "code" : "0x30", "peice": "Knight 2", "move": "b2 l1" },
    { "code" : "0x31", "peice": "Queen 1", "move": "r3" },
    { "code" : "0x32", "peice": "Bishop 2", "move": "f5 r5" },
    { "code" : "0x34", "peice": "Knight 1", "move": "f2 r1" },
    { "code" : "0x36", "peice": "Knight 1", "move": "f1 r2" },
    { "code" : "0x37", "peice": "Queen 1", "move": "f4" },
    { "code" : "0x38", "peice": "Queen 2", "move": "f4 l4" },
    { "code" : "0x39", "peice": "Queen 1", "move": "r5" },
    { "code" : "0x3a", "peice": "Bishop 1", "move": "f6 r6" },
    { "code" : "0x3b", "peice": "Queen 2", "move": "f5 l5" },
    { "code" : "0x3c", "peice": "Bishop 1", "move": "f5 l5" },
    { "code" : "0x41", "peice": "Queen 2", "move": "f5 r5" },
    { "code" : "0x42", "peice": "Queen 1", "move": "f7 l7" },
    { "code" : "0x44", "peice": "King ", "move": "b1 r1" },
    { "code" : "0x45", "peice": "Queen 1", "move": "f3 r3" },
    { "code" : "0x4a", "peice": "Pawn 8", "move": "f2" },
    { "code" : "0x4b", "peice": "Queen 1", "move": "f5 l5" },
    { "code" : "0x4c", "peice": "Knight 2", "move": "f2 r1" },
    { "code" : "0x4d", "peice": "Queen 2", "move": "f1" },
    { "code" : "0x50", "peice": "Rook 1", "move": "f6" },
    { "code" : "0x52", "peice": "Rook 1", "move": "r6" },
    { "code" : "0x54", "peice": "Bishop 2", "move": "f1 l1" },
    { "code" : "0x55", "peice": "Pawn 3", "move": "f1" },
    { "code" : "0x5c", "peice": "Pawn 7", "move": "f1 r1" },
    { "code" : "0x5f", "peice": "Pawn 5", "move": "f2" },
    { "code" : "0x61", "peice": "Queen 1", "move": "f6 r6" },
    { "code" : "0x62", "peice": "Pawn 2", "move": "f2" },
    { "code" : "0x63", "peice": "Queen 2", "move": "f7 l7" },
    { "code" : "0x66", "peice": "Bishop 1", "move": "f3 l3" },
    { "code" : "0x67", "peice": "King ", "move": "f1 r1" },
    { "code" : "0x69", "peice": "Rook 2", "move": "f7" },
    { "code" : "0x6a", "peice": "Bishop 1", "move": "f4 r4" },
    { "code" : "0x6b", "peice": "Short Castle", "move": "O-O"},
    { "code" : "0x6e", "peice": "Rook 1", "move": "r5" },
    { "code" : "0x6f", "peice": "Queen 2", "move": "f7 r7" },
    { "code" : "0x72", "peice": "Bishop 2", "move": "f7 l7" },
    { "code" : "0x74", "peice": "Queen 1", "move": "r2" },
    { "code" : "0x79", "peice": "Bishop 2", "move": "f6 l6" },
    { "code" : "0x7a", "peice": "Rook 1", "move": "f3" },
    { "code" : "0x7b", "peice": "Rook 2", "move": "f6" },
    { "code" : "0x7c", "peice": "Pawn 3", "move": "f1 r1" },
    { "code" : "0x7d", "peice": "Rook 2", "move": "f1" },
    { "code" : "0x7e", "peice": "Queen 1", "move": "f3 l3" },
    { "code" : "0x7f", "peice": "Rook 1", "move": "r1" },
    { "code" : "0x80", "peice": "Queen 1", "move": "f6 l6" },
    { "code" : "0x81", "peice": "Rook 1", "move": "f1" },
    { "code" : "0x82", "peice": "Pawn 6", "move": "f1 l1" },
    { "code" : "0x85", "peice": "Knight 1", "move": "f2 l1" },
    { "code" : "0x86", "peice": "Rook 1", "move": "r7" },
    { "code" : "0x87", "peice": "Rook 1", "move": "f5" },
    { "code" : "0x8a", "peice": "Knight 1", "move": "b2 r1" },
    { "code" : "0x8b", "peice": "Pawn 1", "move": "f1 r1" },
    { "code" : "0x8c", "peice": "King ", "move": "b1 l1" },
    { "code" : "0x8e", "peice": "Queen 2", "move": "f2 l2" },
    { "code" : "0x8f", "peice": "Queen 1", "move": "r7" },
    { "code" : "0x92", "peice": "Queen 2", "move": "f1 r1" },
    { "code" : "0x94", "peice": "Queen 1", "move": "f3" },
    { "code" : "0x96", "peice": "Pawn 2", "move": "f1 r1" },
    { "code" : "0x97", "peice": "King ", "move": "l1" },
    { "code" : "0x98", "peice": "Rook 1", "move": "r3" },
    { "code" : "0x99", "peice": "Rook 1", "move": "f4" },
    { "code" : "0x9a", "peice": "Queen 1", "move": "f6" },
    { "code" : "0x9b", "peice": "Pawn 3", "move": "f2" },
    { "code" : "0x9d", "peice": "Queen 1", "move": "f2" },
    { "code" : "0x9f", "peice": "Bishop 2", "move": "f4 l4" },
    { "code" : "0xa0", "peice": "Queen 2", "move": "f3" },
    { "code" : "0xa2", "peice": "Queen 1", "move": "f2 r2" },
    { "code" : "0xa3", "peice": "Pawn 8", "move": "f1" },
    { "code" : "0xa5", "peice": "Rook 2", "move": "f5" },
    { "code" : "0xa9", "peice": "Rook 2", "move": "r2" },
    { "code" : "0xab", "peice": "Queen 2", "move": "f6 l6" },
    { "code" : "0xad", "peice": "Rook 2", "move": "r4" },
    { "code" : "0xae", "peice": "Queen 2", "move": "f3 r3" },
    { "code" : "0xb0", "peice": "Queen 2", "move": "f4" },
    { "code" : "0xb1", "peice": "Pawn 6", "move": "f2" },
    { "code" : "0xb2", "peice": "Bishop 1", "move": "f6 l6" },
    { "code" : "0xb5", "peice": "Rook 2", "move": "r5" },
    { "code" : "0xb7", "peice": "Queen 1", "move": "f5" },
    { "code" : "0xb9", "peice": "Bishop 2", "move": "f3 r3" },
    { "code" : "0xbb", "peice": "Pawn 5", "move": "f1" },
    { "code" : "0xbc", "peice": "Queen 2", "move": "r5" },
    { "code" : "0xbd", "peice": "Queen 2", "move": "f2" },
    { "code" : "0xbe", "peice": "King ", "move": "r1" },
    { "code" : "0xc1", "peice": "Bishop 1", "move": "f2 r2" },
    { "code" : "0xc2", "peice": "Bishop 2", "move": "f2 r2" },
    { "code" : "0xc3", "peice": "Bishop 1", "move": "f2 l2" },
    { "code" : "0xc4", "peice": "Rook 2", "move": "r1" },
    { "code" : "0xc5", "peice": "Rook 2", "move": "f4" },
    { "code" : "0xc6", "peice": "Queen 2", "move": "f5" },
    { "code" : "0xc7", "peice": "Pawn 7", "move": "f1 l1" },
    { "code" : "0xc8", "peice": "Pawn 7", "move": "f2" },
    { "code" : "0xc9", "peice": "Queen 2", "move": "f7" },
    { "code" : "0xca", "peice": "Bishop 2", "move": "f3 l3" },
    { "code" : "0xcb", "peice": "Pawn 6", "move": "f1" },
    { "code" : "0xcc", "peice": "Bishop 2", "move": "f5 l5" },
    { "code" : "0xcd", "peice": "Rook 1", "move": "r2" },
    { "code" : "0xcf", "peice": "Pawn 4", "move": "f1" },
    { "code" : "0xd1", "peice": "Pawn 2", "move": "f1 l1" },
    { "code" : "0xd2", "peice": "Knight 2", "move": "f1 r2" },
    { "code" : "0xd3", "peice": "Knight 2", "move": "f1 l2" },
    { "code" : "0xd7", "peice": "Queen 1", "move": "f1 l1" },
    { "code" : "0xd8", "peice": "Rook 2", "move": "r6" },
    { "code" : "0xd9", "peice": "Queen 1", "move": "f2 l2" },
    { "code" : "0xda", "peice": "Knight 1", "move": "b2 l1" },
    { "code" : "0xdb", "peice": "Pawn 1", "move": "f2" },
    { "code" : "0xde", "peice": "Pawn 5", "move": "f1 l1" },
    { "code" : "0xdf", "peice": "King ", "move": "f1 l1" },
    { "code" : "0xe0", "peice": "Knight 2", "move": "b1 r2" },
    { "code" : "0xe1", "peice": "Rook 1", "move": "f7" },
    { "code" : "0xe3", "peice": "Rook 2", "move": "f3" },
    { "code" : "0xe5", "peice": "Queen 1", "move": "r4" },
    { "code" : "0xe6", "peice": "Pawn 4", "move": "f2" },
    { "code" : "0xe7", "peice": "Queen 1", "move": "f4 r4" },
    { "code" : "0xe8", "peice": "Rook 1", "move": "f2" },
    { "code" : "0xe9", "peice": "Knight 1", "move": "b1 r2" },
    { "code" : "0xeb", "peice": "Pawn 4", "move": "f1 r1" },
    { "code" : "0xec", "peice": "Pawn 1", "move": "f1" },
    { "code" : "0xed", "peice": "Queen 1", "move": "f7 r7" },
    { "code" : "0xee", "peice": "Queen 2", "move": "f1 l1" },
    { "code" : "0xef", "peice": "Rook 1", "move": "r4" },
    { "code" : "0xf0", "peice": "Queen 2", "move": "r7" },
    { "code" : "0xf1", "peice": "Queen 1", "move": "f1 r1" },
    { "code" : "0xf3", "peice": "Knight 2", "move": "f2 l1" },
    { "code" : "0xf4", "peice": "Rook 2", "move": "f2" },
    { "code" : "0xf5", "peice": "Bishop 2", "move": "f1 r1" },
    { "code" : "0xf6", "peice": "Long Castle", "move": "O-O-O" },
    { "code" : "0xf7", "peice": "Knight 1", "move": "f1 l2" },
    { "code" : "0xf8", "peice": "Queen 2", "move": "r1" },
    { "code" : "0xf9", "peice": "Queen 2", "move": "f6" },
    { "code" : "0xfa", "peice": "Queen 2", "move": "r3" },
    { "code" : "0xfb", "peice": "Queen 2", "move": "f2 r2" },
    { "code" : "0xfd", "peice": "Queen 1", "move": "f7" },
    { "code" : "0xfe", "peice": "Queen 2", "move": "f3 l3" }
];
module.exports = CTGMoveService;

}).call(this,require('_process'))
},{"../../utils.js":51,"_process":12}],47:[function(require,module,exports){
"use strict";
const Polyglot = require("./polyglot/index.js");
const CTG = require('./ctg/index.js');
const ABK = require('./abk/index.js');
module.exports = {
  'Polyglot' : Polyglot,
  'CTG' : CTG,
  'ABK' : ABK
};

},{"./abk/index.js":42,"./ctg/index.js":45,"./polyglot/index.js":50}],48:[function(require,module,exports){
"use strict";
const utils = require("../../utils.js");
const Uint64BE = require("int64-buffer").Uint64BE;

const files = utils.board.FILES;
module.exports.pieceTypes = {
    bp: 0,
    wp: 1,
    bn: 2,
    wn: 3,
    bb: 4,
    wb: 5,
    br: 6,
    wr: 7,
    bq: 8,
    wq: 9,
    bk: 10,
    wk: 11
};

const Random64 = [
    Uint64BE(0x9D39247E, 0x33776D41), Uint64BE(0x2AF73980, 0x05AAA5C7), Uint64BE(0x44DB0150, 0x24623547), Uint64BE(0x9C15F73E, 0x62A76AE2),
    Uint64BE(0x75834465, 0x489C0C89), Uint64BE(0x3290AC3A, 0x203001BF), Uint64BE(0x0FBBAD1F, 0x61042279), Uint64BE(0xE83A908F, 0xF2FB60CA),
    Uint64BE(0x0D7E765D, 0x58755C10), Uint64BE(0x1A083822, 0xCEAFE02D), Uint64BE(0x9605D5F0, 0xE25EC3B0), Uint64BE(0xD021FF5C, 0xD13A2ED5),
    Uint64BE(0x40BDF15D, 0x4A672E32), Uint64BE(0x01135514, 0x6FD56395), Uint64BE(0x5DB48320, 0x46F3D9E5), Uint64BE(0x239F8B2D, 0x7FF719CC),
    Uint64BE(0x05D1A1AE, 0x85B49AA1), Uint64BE(0x679F848F, 0x6E8FC971), Uint64BE(0x7449BBFF, 0x801FED0B), Uint64BE(0x7D11CDB1, 0xC3B7ADF0),
    Uint64BE(0x82C7709E, 0x781EB7CC), Uint64BE(0xF3218F1C, 0x9510786C), Uint64BE(0x331478F3, 0xAF51BBE6), Uint64BE(0x4BB38DE5, 0xE7219443),
    Uint64BE(0xAA649C6E, 0xBCFD50FC), Uint64BE(0x8DBD98A3, 0x52AFD40B), Uint64BE(0x87D2074B, 0x81D79217), Uint64BE(0x19F3C751, 0xD3E92AE1),
    Uint64BE(0xB4AB30F0, 0x62B19ABF), Uint64BE(0x7B0500AC, 0x42047AC4), Uint64BE(0xC9452CA8, 0x1A09D85D), Uint64BE(0x24AA6C51, 0x4DA27500),
    Uint64BE(0x4C9F3442, 0x7501B447), Uint64BE(0x14A68FD7, 0x3C910841), Uint64BE(0xA71B9B83, 0x461CBD93), Uint64BE(0x03488B95, 0xB0F1850F),
    Uint64BE(0x637B2B34, 0xFF93C040), Uint64BE(0x09D1BC9A, 0x3DD90A94), Uint64BE(0x35756683, 0x34A1DD3B), Uint64BE(0x735E2B97, 0xA4C45A23),
    Uint64BE(0x18727070, 0xF1BD400B), Uint64BE(0x1FCBACD2, 0x59BF02E7), Uint64BE(0xD310A7C2, 0xCE9B6555), Uint64BE(0xBF983FE0, 0xFE5D8244),
    Uint64BE(0x9F74D14F, 0x7454A824), Uint64BE(0x51EBDC4A, 0xB9BA3035), Uint64BE(0x5C82C505, 0xDB9AB0FA), Uint64BE(0xFCF7FE8A, 0x3430B241),
    Uint64BE(0x3253A729, 0xB9BA3DDE), Uint64BE(0x8C74C368, 0x081B3075), Uint64BE(0xB9BC6C87, 0x167C33E7), Uint64BE(0x7EF48F2B, 0x83024E20),
    Uint64BE(0x11D505D4, 0xC351BD7F), Uint64BE(0x6568FCA9, 0x2C76A243), Uint64BE(0x4DE0B0F4, 0x0F32A7B8), Uint64BE(0x96D69346, 0x0CC37E5D),
    Uint64BE(0x42E240CB, 0x63689F2F), Uint64BE(0x6D2BDCDA, 0xE2919661), Uint64BE(0x42880B02, 0x36E4D951), Uint64BE(0x5F0F4A58, 0x98171BB6),
    Uint64BE(0x39F890F5, 0x79F92F88), Uint64BE(0x93C5B5F4, 0x7356388B), Uint64BE(0x63DC359D, 0x8D231B78), Uint64BE(0xEC16CA8A, 0xEA98AD76),
    Uint64BE(0x5355F900, 0xC2A82DC7), Uint64BE(0x07FB9F85, 0x5A997142), Uint64BE(0x5093417A, 0xA8A7ED5E), Uint64BE(0x7BCBC38D, 0xA25A7F3C),
    Uint64BE(0x19FC8A76, 0x8CF4B6D4), Uint64BE(0x637A7780, 0xDECFC0D9), Uint64BE(0x8249A47A, 0xEE0E41F7), Uint64BE(0x79AD6955, 0x01E7D1E8),
    Uint64BE(0x14ACBAF4, 0x777D5776), Uint64BE(0xF145B6BE, 0xCCDEA195), Uint64BE(0xDABF2AC8, 0x201752FC), Uint64BE(0x24C3C94D, 0xF9C8D3F6),
    Uint64BE(0xBB6E2924, 0xF03912EA), Uint64BE(0x0CE26C0B, 0x95C980D9), Uint64BE(0xA49CD132, 0xBFBF7CC4), Uint64BE(0xE99D662A, 0xF4243939),
    Uint64BE(0x27E6AD78, 0x91165C3F), Uint64BE(0x8535F040, 0xB9744FF1), Uint64BE(0x54B3F4FA, 0x5F40D873), Uint64BE(0x72B12C32, 0x127FED2B),
    Uint64BE(0xEE954D3C, 0x7B411F47), Uint64BE(0x9A85AC90, 0x9A24EAA1), Uint64BE(0x70AC4CD9, 0xF04F21F5), Uint64BE(0xF9B89D3E, 0x99A075C2),
    Uint64BE(0x87B3E2B2, 0xB5C907B1), Uint64BE(0xA366E5B8, 0xC54F48B8), Uint64BE(0xAE4A9346, 0xCC3F7CF2), Uint64BE(0x1920C04D, 0x47267BBD),
    Uint64BE(0x87BF02C6, 0xB49E2AE9), Uint64BE(0x092237AC, 0x237F3859), Uint64BE(0xFF07F64E, 0xF8ED14D0), Uint64BE(0x8DE8DCA9, 0xF03CC54E),
    Uint64BE(0x9C163326, 0x4DB49C89), Uint64BE(0xB3F22C3D, 0x0B0B38ED), Uint64BE(0x390E5FB4, 0x4D01144B), Uint64BE(0x5BFEA5B4, 0x712768E9),
    Uint64BE(0x1E103291, 0x1FA78984), Uint64BE(0x9A74ACB9, 0x64E78CB3), Uint64BE(0x4F80F7A0, 0x35DAFB04), Uint64BE(0x6304D09A, 0x0B3738C4),
    Uint64BE(0x2171E646, 0x83023A08), Uint64BE(0x5B9B63EB, 0x9CEFF80C), Uint64BE(0x506AACF4, 0x89889342), Uint64BE(0x1881AFC9, 0xA3A701D6),
    Uint64BE(0x65030804, 0x40750644), Uint64BE(0xDFD39533, 0x9CDBF4A7), Uint64BE(0xEF927DBC, 0xF00C20F2), Uint64BE(0x7B32F7D1, 0xE03680EC),
    Uint64BE(0xB9FD7620, 0xE7316243), Uint64BE(0x05A7E8A5, 0x7DB91B77), Uint64BE(0xB5889C6E, 0x15630A75), Uint64BE(0x4A750A09, 0xCE9573F7),
    Uint64BE(0xCF464CEC, 0x899A2F8A), Uint64BE(0xF538639C, 0xE705B824), Uint64BE(0x3C79A0FF, 0x5580EF7F), Uint64BE(0xEDE6C87F, 0x8477609D),
    Uint64BE(0x799E81F0, 0x5BC93F31), Uint64BE(0x86536B8C, 0xF3428A8C), Uint64BE(0x97D7374C, 0x60087B73), Uint64BE(0xA246637C, 0xFF328532),
    Uint64BE(0x043FCAE6, 0x0CC0EBA0), Uint64BE(0x920E4495, 0x35DD359E), Uint64BE(0x70EB093B, 0x15B290CC), Uint64BE(0x73A19219, 0x16591CBD),
    Uint64BE(0x56436C9F, 0xE1A1AA8D), Uint64BE(0xEFAC4B70, 0x633B8F81), Uint64BE(0xBB215798, 0xD45DF7AF), Uint64BE(0x45F20042, 0xF24F1768),
    Uint64BE(0x930F80F4, 0xE8EB7462), Uint64BE(0xFF6712FF, 0xCFD75EA1), Uint64BE(0xAE623FD6, 0x7468AA70), Uint64BE(0xDD2C5BC8, 0x4BC8D8FC),
    Uint64BE(0x7EED120D, 0x54CF2DD9), Uint64BE(0x22FE5454, 0x01165F1C), Uint64BE(0xC91800E9, 0x8FB99929), Uint64BE(0x808BD68E, 0x6AC10365),
    Uint64BE(0xDEC46814, 0x5B7605F6), Uint64BE(0x1BEDE3A3, 0xAEF53302), Uint64BE(0x43539603, 0xD6C55602), Uint64BE(0xAA969B5C, 0x691CCB7A),
    Uint64BE(0xA87832D3, 0x92EFEE56), Uint64BE(0x65942C7B, 0x3C7E11AE), Uint64BE(0xDED2D633, 0xCAD004F6), Uint64BE(0x21F08570, 0xF420E565),
    Uint64BE(0xB415938D, 0x7DA94E3C), Uint64BE(0x91B859E5, 0x9ECB6350), Uint64BE(0x10CFF333, 0xE0ED804A), Uint64BE(0x28AED140, 0xBE0BB7DD),
    Uint64BE(0xC5CC1D89, 0x724FA456), Uint64BE(0x5648F680, 0xF11A2741), Uint64BE(0x2D255069, 0xF0B7DAB3), Uint64BE(0x9BC5A38E, 0xF729ABD4),
    Uint64BE(0xEF2F0543, 0x08F6A2BC), Uint64BE(0xAF2042F5, 0xCC5C2858), Uint64BE(0x480412BA, 0xB7F5BE2A), Uint64BE(0xAEF3AF4A, 0x563DFE43),
    Uint64BE(0x19AFE59A, 0xE451497F), Uint64BE(0x52593803, 0xDFF1E840), Uint64BE(0xF4F076E6, 0x5F2CE6F0), Uint64BE(0x11379625, 0x747D5AF3),
    Uint64BE(0xBCE5D224, 0x8682C115), Uint64BE(0x9DA4243D, 0xE836994F), Uint64BE(0x066F70B3, 0x3FE09017), Uint64BE(0x4DC4DE18, 0x9B671A1C),
    Uint64BE(0x51039AB7, 0x712457C3), Uint64BE(0xC07A3F80, 0xC31FB4B4), Uint64BE(0xB46EE9C5, 0xE64A6E7C), Uint64BE(0xB3819A42, 0xABE61C87),
    Uint64BE(0x21A00793, 0x3A522A20), Uint64BE(0x2DF16F76, 0x1598AA4F), Uint64BE(0x763C4A13, 0x71B368FD), Uint64BE(0xF793C467, 0x02E086A0),
    Uint64BE(0xD7288E01, 0x2AEB8D31), Uint64BE(0xDE336A2A, 0x4BC1C44B), Uint64BE(0x0BF692B3, 0x8D079F23), Uint64BE(0x2C604A7A, 0x177326B3),
    Uint64BE(0x4850E73E, 0x03EB6064), Uint64BE(0xCFC447F1, 0xE53C8E1B), Uint64BE(0xB05CA3F5, 0x64268D99), Uint64BE(0x9AE182C8, 0xBC9474E8),
    Uint64BE(0xA4FC4BD4, 0xFC5558CA), Uint64BE(0xE755178D, 0x58FC4E76), Uint64BE(0x69B97DB1, 0xA4C03DFE), Uint64BE(0xF9B5B7C4, 0xACC67C96),
    Uint64BE(0xFC6A82D6, 0x4B8655FB), Uint64BE(0x9C684CB6, 0xC4D24417), Uint64BE(0x8EC97D29, 0x17456ED0), Uint64BE(0x6703DF9D, 0x2924E97E),
    Uint64BE(0xC547F57E, 0x42A7444E), Uint64BE(0x78E37644, 0xE7CAD29E), Uint64BE(0xFE9A44E9, 0x362F05FA), Uint64BE(0x08BD35CC, 0x38336615),
    Uint64BE(0x9315E5EB, 0x3A129ACE), Uint64BE(0x94061B87, 0x1E04DF75), Uint64BE(0xDF1D9F9D, 0x784BA010), Uint64BE(0x3BBA57B6, 0x8871B59D),
    Uint64BE(0xD2B7ADEE, 0xDED1F73F), Uint64BE(0xF7A255D8, 0x3BC373F8), Uint64BE(0xD7F4F244, 0x8C0CEB81), Uint64BE(0xD95BE88C, 0xD210FFA7),
    Uint64BE(0x336F52F8, 0xFF4728E7), Uint64BE(0xA74049DA, 0xC312AC71), Uint64BE(0xA2F61BB6, 0xE437FDB5), Uint64BE(0x4F2A5CB0, 0x7F6A35B3),
    Uint64BE(0x87D380BD, 0xA5BF7859), Uint64BE(0x16B9F7E0, 0x6C453A21), Uint64BE(0x7BA2484C, 0x8A0FD54E), Uint64BE(0xF3A678CA, 0xD9A2E38C),
    Uint64BE(0x39B0BF7D, 0xDE437BA2), Uint64BE(0xFCAF55C1, 0xBF8A4424), Uint64BE(0x18FCF680, 0x573FA594), Uint64BE(0x4C0563B8, 0x9F495AC3),
    Uint64BE(0x40E08793, 0x1A00930D), Uint64BE(0x8CFFA941, 0x2EB642C1), Uint64BE(0x68CA3905, 0x3261169F), Uint64BE(0x7A1EE967, 0xD27579E2),
    Uint64BE(0x9D1D60E5, 0x076F5B6F), Uint64BE(0x3810E399, 0xB6F65BA2), Uint64BE(0x32095B6D, 0x4AB5F9B1), Uint64BE(0x35CAB621, 0x09DD038A),
    Uint64BE(0xA90B2449, 0x9FCFAFB1), Uint64BE(0x77A225A0, 0x7CC2C6BD), Uint64BE(0x513E5E63, 0x4C70E331), Uint64BE(0x4361C0CA, 0x3F692F12),
    Uint64BE(0xD941ACA4, 0x4B20A45B), Uint64BE(0x528F7C86, 0x02C5807B), Uint64BE(0x52AB92BE, 0xB9613989), Uint64BE(0x9D1DFA2E, 0xFC557F73),
    Uint64BE(0x722FF175, 0xF572C348), Uint64BE(0x1D1260A5, 0x1107FE97), Uint64BE(0x7A249A57, 0xEC0C9BA2), Uint64BE(0x04208FE9, 0xE8F7F2D6),
    Uint64BE(0x5A110C60, 0x58B920A0), Uint64BE(0x0CD9A497, 0x658A5698), Uint64BE(0x56FD23C8, 0xF9715A4C), Uint64BE(0x284C847B, 0x9D887AAE),
    Uint64BE(0x04FEABFB, 0xBDB619CB), Uint64BE(0x742E1E65, 0x1C60BA83), Uint64BE(0x9A9632E6, 0x5904AD3C), Uint64BE(0x881B82A1, 0x3B51B9E2),
    Uint64BE(0x506E6744, 0xCD974924), Uint64BE(0xB0183DB5, 0x6FFC6A79), Uint64BE(0x0ED9B915, 0xC66ED37E), Uint64BE(0x5E11E86D, 0x5873D484),
    Uint64BE(0xF678647E, 0x3519AC6E), Uint64BE(0x1B85D488, 0xD0F20CC5), Uint64BE(0xDAB9FE65, 0x25D89021), Uint64BE(0x0D151D86, 0xADB73615),
    Uint64BE(0xA865A54E, 0xDCC0F019), Uint64BE(0x93C42566, 0xAEF98FFB), Uint64BE(0x99E7AFEA, 0xBE000731), Uint64BE(0x48CBFF08, 0x6DDF285A),
    Uint64BE(0x7F9B6AF1, 0xEBF78BAF), Uint64BE(0x58627E1A, 0x149BBA21), Uint64BE(0x2CD16E2A, 0xBD791E33), Uint64BE(0xD363EFF5, 0xF0977996),
    Uint64BE(0x0CE2A38C, 0x344A6EED), Uint64BE(0x1A804AAD, 0xB9CFA741), Uint64BE(0x907F3042, 0x1D78C5DE), Uint64BE(0x501F65ED, 0xB3034D07),
    Uint64BE(0x37624AE5, 0xA48FA6E9), Uint64BE(0x957BAF61, 0x700CFF4E), Uint64BE(0x3A6C2793, 0x4E31188A), Uint64BE(0xD4950353, 0x6ABCA345),
    Uint64BE(0x088E0495, 0x89C432E0), Uint64BE(0xF943AEE7, 0xFEBF21B8), Uint64BE(0x6C3B8E3E, 0x336139D3), Uint64BE(0x364F6FFA, 0x464EE52E),
    Uint64BE(0xD60F6DCE, 0xDC314222), Uint64BE(0x56963B0D, 0xCA418FC0), Uint64BE(0x16F50EDF, 0x91E513AF), Uint64BE(0xEF195591, 0x4B609F93),
    Uint64BE(0x565601C0, 0x364E3228), Uint64BE(0xECB53939, 0x887E8175), Uint64BE(0xBAC7A9A1, 0x8531294B), Uint64BE(0xB344C470, 0x397BBA52),
    Uint64BE(0x65D34954, 0xDAF3CEBD), Uint64BE(0xB4B81B3F, 0xA97511E2), Uint64BE(0xB4220611, 0x93D6F6A7), Uint64BE(0x07158240, 0x1C38434D),
    Uint64BE(0x7A13F18B, 0xBEDC4FF5), Uint64BE(0xBC4097B1, 0x16C524D2), Uint64BE(0x59B97885, 0xE2F2EA28), Uint64BE(0x99170A5D, 0xC3115544),
    Uint64BE(0x6F423357, 0xE7C6A9F9), Uint64BE(0x325928EE, 0x6E6F8794), Uint64BE(0xD0E43662, 0x28B03343), Uint64BE(0x565C31F7, 0xDE89EA27),
    Uint64BE(0x30F56114, 0x84119414), Uint64BE(0xD873DB39, 0x1292ED4F), Uint64BE(0x7BD94E1D, 0x8E17DEBC), Uint64BE(0xC7D9F168, 0x64A76E94),
    Uint64BE(0x947AE053, 0xEE56E63C), Uint64BE(0xC8C93882, 0xF9475F5F), Uint64BE(0x3A9BF55B, 0xA91F81CA), Uint64BE(0xD9A11FBB, 0x3D9808E4),
    Uint64BE(0x0FD22063, 0xEDC29FCA), Uint64BE(0xB3F256D8, 0xACA0B0B9), Uint64BE(0xB03031A8, 0xB4516E84), Uint64BE(0x35DD37D5, 0x871448AF),
    Uint64BE(0xE9F6082B, 0x05542E4E), Uint64BE(0xEBFAFA33, 0xD7254B59), Uint64BE(0x9255ABB5, 0x0D532280), Uint64BE(0xB9AB4CE5, 0x7F2D34F3),
    Uint64BE(0x693501D6, 0x28297551), Uint64BE(0xC62C58F9, 0x7DD949BF), Uint64BE(0xCD454F8F, 0x19C5126A), Uint64BE(0xBBE83F4E, 0xCC2BDECB),
    Uint64BE(0xDC842B7E, 0x2819E230), Uint64BE(0xBA89142E, 0x007503B8), Uint64BE(0xA3BC941D, 0x0A5061CB), Uint64BE(0xE9F6760E, 0x32CD8021),
    Uint64BE(0x09C7E552, 0xBC76492F), Uint64BE(0x852F5493, 0x4DA55CC9), Uint64BE(0x8107FCCF, 0x064FCF56), Uint64BE(0x098954D5, 0x1FFF6580),
    Uint64BE(0x23B70EDB, 0x1955C4BF), Uint64BE(0xC330DE42, 0x6430F69D), Uint64BE(0x4715ED43, 0xE8A45C0A), Uint64BE(0xA8D7E4DA, 0xB780A08D),
    Uint64BE(0x0572B974, 0xF03CE0BB), Uint64BE(0xB57D2E98, 0x5E1419C7), Uint64BE(0xE8D9ECBE, 0x2CF3D73F), Uint64BE(0x2FE4B171, 0x70E59750),
    Uint64BE(0x11317BA8, 0x7905E790), Uint64BE(0x7FBF21EC, 0x8A1F45EC), Uint64BE(0x1725CABF, 0xCB045B00), Uint64BE(0x964E915C, 0xD5E2B207),
    Uint64BE(0x3E2B8BCB, 0xF016D66D), Uint64BE(0xBE7444E3, 0x9328A0AC), Uint64BE(0xF85B2B4F, 0xBCDE44B7), Uint64BE(0x49353FEA, 0x39BA63B1),
    Uint64BE(0x1DD01AAF, 0xCD53486A), Uint64BE(0x1FCA8A92, 0xFD719F85), Uint64BE(0xFC7C95D8, 0x27357AFA), Uint64BE(0x18A6A990, 0xC8B35EBD),
    Uint64BE(0xCCCB7005, 0xC6B9C28D), Uint64BE(0x3BDBB92C, 0x43B17F26), Uint64BE(0xAA70B5B4, 0xF89695A2), Uint64BE(0xE94C39A5, 0x4A98307F),
    Uint64BE(0xB7A0B174, 0xCFF6F36E), Uint64BE(0xD4DBA847, 0x29AF48AD), Uint64BE(0x2E18BC1A, 0xD9704A68), Uint64BE(0x2DE0966D, 0xAF2F8B1C),
    Uint64BE(0xB9C11D5B, 0x1E43A07E), Uint64BE(0x64972D68, 0xDEE33360), Uint64BE(0x94628D38, 0xD0C20584), Uint64BE(0xDBC0D2B6, 0xAB90A559),
    Uint64BE(0xD2733C43, 0x35C6A72F), Uint64BE(0x7E75D99D, 0x94A70F4D), Uint64BE(0x6CED1983, 0x376FA72B), Uint64BE(0x97FCAACB, 0xF030BC24),
    Uint64BE(0x7B77497B, 0x32503B12), Uint64BE(0x8547EDDF, 0xB81CCB94), Uint64BE(0x79999CDF, 0xF70902CB), Uint64BE(0xCFFE1939, 0x438E9B24),
    Uint64BE(0x829626E3, 0x892D95D7), Uint64BE(0x92FAE242, 0x91F2B3F1), Uint64BE(0x63E22C14, 0x7B9C3403), Uint64BE(0xC678B6D8, 0x60284A1C),
    Uint64BE(0x58738888, 0x50659AE7), Uint64BE(0x0981DCD2, 0x96A8736D), Uint64BE(0x9F65789A, 0x6509A440), Uint64BE(0x9FF38FED, 0x72E9052F),
    Uint64BE(0xE479EE5B, 0x9930578C), Uint64BE(0xE7F28ECD, 0x2D49EECD), Uint64BE(0x56C074A5, 0x81EA17FE), Uint64BE(0x5544F7D7, 0x74B14AEF),
    Uint64BE(0x7B3F0195, 0xFC6F290F), Uint64BE(0x12153635, 0xB2C0CF57), Uint64BE(0x7F5126DB, 0xBA5E0CA7), Uint64BE(0x7A76956C, 0x3EAFB413),
    Uint64BE(0x3D5774A1, 0x1D31AB39), Uint64BE(0x8A1B0838, 0x21F40CB4), Uint64BE(0x7B4A38E3, 0x2537DF62), Uint64BE(0x95011364, 0x6D1D6E03),
    Uint64BE(0x4DA8979A, 0x0041E8A9), Uint64BE(0x3BC36E07, 0x8F7515D7), Uint64BE(0x5D0A12F2, 0x7AD310D1), Uint64BE(0x7F9D1A2E, 0x1EBE1327),
    Uint64BE(0xDA3A361B, 0x1C5157B1), Uint64BE(0xDCDD7D20, 0x903D0C25), Uint64BE(0x36833336, 0xD068F707), Uint64BE(0xCE68341F, 0x79893389),
    Uint64BE(0xAB909016, 0x8DD05F34), Uint64BE(0x43954B32, 0x52DC25E5), Uint64BE(0xB438C2B6, 0x7F98E5E9), Uint64BE(0x10DCD78E, 0x3851A492),
    Uint64BE(0xDBC27AB5, 0x447822BF), Uint64BE(0x9B3CDB65, 0xF82CA382), Uint64BE(0xB67B7896, 0x167B4C84), Uint64BE(0xBFCED1B0, 0x048EAC50),
    Uint64BE(0xA9119B60, 0x369FFEBD), Uint64BE(0x1FFF7AC8, 0x0904BF45), Uint64BE(0xAC12FB17, 0x1817EEE7), Uint64BE(0xAF08DA91, 0x77DDA93D),
    Uint64BE(0x1B0CAB93, 0x6E65C744), Uint64BE(0xB559EB1D, 0x04E5E932), Uint64BE(0xC37B45B3, 0xF8D6F2BA), Uint64BE(0xC3A9DC22, 0x8CAAC9E9),
    Uint64BE(0xF3B8B667, 0x5A6507FF), Uint64BE(0x9FC477DE, 0x4ED681DA), Uint64BE(0x67378D8E, 0xCCEF96CB), Uint64BE(0x6DD856D9, 0x4D259236),
    Uint64BE(0xA319CE15, 0xB0B4DB31), Uint64BE(0x07397375, 0x1F12DD5E), Uint64BE(0x8A8E849E, 0xB32781A5), Uint64BE(0xE1925C71, 0x285279F5),
    Uint64BE(0x74C04BF1, 0x790C0EFE), Uint64BE(0x4DDA4815, 0x3C94938A), Uint64BE(0x9D266D6A, 0x1CC0542C), Uint64BE(0x7440FB81, 0x6508C4FE),
    Uint64BE(0x13328503, 0xDF48229F), Uint64BE(0xD6BF7BAE, 0xE43CAC40), Uint64BE(0x4838D65F, 0x6EF6748F), Uint64BE(0x1E152328, 0xF3318DEA),
    Uint64BE(0x8F8419A3, 0x48F296BF), Uint64BE(0x72C8834A, 0x5957B511), Uint64BE(0xD7A023A7, 0x3260B45C), Uint64BE(0x94EBC8AB, 0xCFB56DAE),
    Uint64BE(0x9FC10D0F, 0x989993E0), Uint64BE(0xDE68A235, 0x5B93CAE6), Uint64BE(0xA44CFE79, 0xAE538BBE), Uint64BE(0x9D1D84FC, 0xCE371425),
    Uint64BE(0x51D2B1AB, 0x2DDFB636), Uint64BE(0x2FD7E4B9, 0xE72CD38C), Uint64BE(0x65CA5B96, 0xB7552210), Uint64BE(0xDD69A0D8, 0xAB3B546D),
    Uint64BE(0x604D51B2, 0x5FBF70E2), Uint64BE(0x73AA8A56, 0x4FB7AC9E), Uint64BE(0x1A8C1E99, 0x2B941148), Uint64BE(0xAAC40A27, 0x03D9BEA0),
    Uint64BE(0x764DBEAE, 0x7FA4F3A6), Uint64BE(0x1E99B96E, 0x70A9BE8B), Uint64BE(0x2C5E9DEB, 0x57EF4743), Uint64BE(0x3A938FEE, 0x32D29981),
    Uint64BE(0x26E6DB8F, 0xFDF5ADFE), Uint64BE(0x469356C5, 0x04EC9F9D), Uint64BE(0xC8763C5B, 0x08D1908C), Uint64BE(0x3F6C6AF8, 0x59D80055),
    Uint64BE(0x7F7CC394, 0x20A3A545), Uint64BE(0x9BFB227E, 0xBDF4C5CE), Uint64BE(0x89039D79, 0xD6FC5C5C), Uint64BE(0x8FE88B57, 0x305E2AB6),
    Uint64BE(0xA09E8C8C, 0x35AB96DE), Uint64BE(0xFA7E3939, 0x83325753), Uint64BE(0xD6B6D0EC, 0xC617C699), Uint64BE(0xDFEA21EA, 0x9E7557E3),
    Uint64BE(0xB67C1FA4, 0x81680AF8), Uint64BE(0xCA1E3785, 0xA9E724E5), Uint64BE(0x1CFC8BED, 0x0D681639), Uint64BE(0xD18D8549, 0xD140CAEA),
    Uint64BE(0x4ED0FE7E, 0x9DC91335), Uint64BE(0xE4DBF063, 0x4473F5D2), Uint64BE(0x1761F93A, 0x44D5AEFE), Uint64BE(0x53898E4C, 0x3910DA55),
    Uint64BE(0x734DE818, 0x1F6EC39A), Uint64BE(0x2680B122, 0xBAA28D97), Uint64BE(0x298AF231, 0xC85BAFAB), Uint64BE(0x7983EED3, 0x740847D5),
    Uint64BE(0x66C1A2A1, 0xA60CD889), Uint64BE(0x9E17E496, 0x42A3E4C1), Uint64BE(0xEDB454E7, 0xBADC0805), Uint64BE(0x50B704CA, 0xB602C329),
    Uint64BE(0x4CC317FB, 0x9CDDD023), Uint64BE(0x66B4835D, 0x9EAFEA22), Uint64BE(0x219B97E2, 0x6FFC81BD), Uint64BE(0x261E4E4C, 0x0A333A9D),
    Uint64BE(0x1FE2CCA7, 0x6517DB90), Uint64BE(0xD7504DFA, 0x8816EDBB), Uint64BE(0xB9571FA0, 0x4DC089C8), Uint64BE(0x1DDC0325, 0x259B27DE),
    Uint64BE(0xCF3F4688, 0x801EB9AA), Uint64BE(0xF4F5D05C, 0x10CAB243), Uint64BE(0x38B6525C, 0x21A42B0E), Uint64BE(0x36F60E2B, 0xA4FA6800),
    Uint64BE(0xEB359380, 0x3173E0CE), Uint64BE(0x9C4CD625, 0x7C5A3603), Uint64BE(0xAF0C317D, 0x32ADAA8A), Uint64BE(0x258E5A80, 0xC7204C4B),
    Uint64BE(0x8B889D62, 0x4D44885D), Uint64BE(0xF4D14597, 0xE660F855), Uint64BE(0xD4347F66, 0xEC8941C3), Uint64BE(0xE699ED85, 0xB0DFB40D),
    Uint64BE(0x2472F620, 0x7C2D0484), Uint64BE(0xC2A1E7B5, 0xB459AEB5), Uint64BE(0xAB4F6451, 0xCC1D45EC), Uint64BE(0x63767572, 0xAE3D6174),
    Uint64BE(0xA59E0BD1, 0x01731A28), Uint64BE(0x116D0016, 0xCB948F09), Uint64BE(0x2CF9C8CA, 0x052F6E9F), Uint64BE(0x0B090A75, 0x60A968E3),
    Uint64BE(0xABEEDDB2, 0xDDE06FF1), Uint64BE(0x58EFC10B, 0x06A2068D), Uint64BE(0xC6E57A78, 0xFBD986E0), Uint64BE(0x2EAB8CA6, 0x3CE802D7),
    Uint64BE(0x14A19564, 0x0116F336), Uint64BE(0x7C0828DD, 0x624EC390), Uint64BE(0xD74BBE77, 0xE6116AC7), Uint64BE(0x804456AF, 0x10F5FB53),
    Uint64BE(0xEBE9EA2A, 0xDF4321C7), Uint64BE(0x03219A39, 0xEE587A30), Uint64BE(0x49787FEF, 0x17AF9924), Uint64BE(0xA1E9300C, 0xD8520548),
    Uint64BE(0x5B45E522, 0xE4B1B4EF), Uint64BE(0xB49C3B39, 0x95091A36), Uint64BE(0xD4490AD5, 0x26F14431), Uint64BE(0x12A8F216, 0xAF9418C2),
    Uint64BE(0x001F837C, 0xC7350524), Uint64BE(0x1877B51E, 0x57A764D5), Uint64BE(0xA2853B80, 0xF17F58EE), Uint64BE(0x993E1DE7, 0x2D36D310),
    Uint64BE(0xB3598080, 0xCE64A656), Uint64BE(0x252F59CF, 0x0D9F04BB), Uint64BE(0xD23C8E17, 0x6D113600), Uint64BE(0x1BDA0492, 0xE7E4586E),
    Uint64BE(0x21E0BD50, 0x26C619BF), Uint64BE(0x3B097ADA, 0xF088F94E), Uint64BE(0x8D14DEDB, 0x30BE846E), Uint64BE(0xF95CFFA2, 0x3AF5F6F4),
    Uint64BE(0x38717007, 0x61B3F743), Uint64BE(0xCA672B91, 0xE9E4FA16), Uint64BE(0x64C8E531, 0xBFF53B55), Uint64BE(0x241260ED, 0x4AD1E87D),
    Uint64BE(0x106C09B9, 0x72D2E822), Uint64BE(0x7FBA1954, 0x10E5CA30), Uint64BE(0x7884D9BC, 0x6CB569D8), Uint64BE(0x0647DFED, 0xCD894A29),
    Uint64BE(0x63573FF0, 0x3E224774), Uint64BE(0x4FC8E956, 0x0F91B123), Uint64BE(0x1DB956E4, 0x50275779), Uint64BE(0xB8D91274, 0xB9E9D4FB),
    Uint64BE(0xA2EBEE47, 0xE2FBFCE1), Uint64BE(0xD9F1F30C, 0xCD97FB09), Uint64BE(0xEFED53D7, 0x5FD64E6B), Uint64BE(0x2E6D02C3, 0x6017F67F),
    Uint64BE(0xA9AA4D20, 0xDB084E9B), Uint64BE(0xB64BE8D8, 0xB25396C1), Uint64BE(0x70CB6AF7, 0xC2D5BCF0), Uint64BE(0x98F076A4, 0xF7A2322E),
    Uint64BE(0xBF844708, 0x05E69B5F), Uint64BE(0x94C3251F, 0x06F90CF3), Uint64BE(0x3E003E61, 0x6A6591E9), Uint64BE(0xB925A6CD, 0x0421AFF3),
    Uint64BE(0x61BDD130, 0x7C66E300), Uint64BE(0xBF8D5108, 0xE27E0D48), Uint64BE(0x240AB57A, 0x8B888B20), Uint64BE(0xFC87614B, 0xAF287E07),
    Uint64BE(0xEF02CDD0, 0x6FFDB432), Uint64BE(0xA1082C04, 0x66DF6C0A), Uint64BE(0x8215E577, 0x001332C8), Uint64BE(0xD39BB9C3, 0xA48DB6CF),
    Uint64BE(0x27382596, 0x34305C14), Uint64BE(0x61CF4F94, 0xC97DF93D), Uint64BE(0x1B6BACA2, 0xAE4E125B), Uint64BE(0x758F450C, 0x88572E0B),
    Uint64BE(0x959F587D, 0x507A8359), Uint64BE(0xB063E962, 0xE045F54D), Uint64BE(0x60E8ED72, 0xC0DFF5D1), Uint64BE(0x7B649785, 0x55326F9F),
    Uint64BE(0xFD080D23, 0x6DA814BA), Uint64BE(0x8C90FD9B, 0x083F4558), Uint64BE(0x106F72FE, 0x81E2C590), Uint64BE(0x7976033A, 0x39F7D952),
    Uint64BE(0xA4EC0132, 0x764CA04B), Uint64BE(0x733EA705, 0xFAE4FA77), Uint64BE(0xB4D8F77B, 0xC3E56167), Uint64BE(0x9E21F4F9, 0x03B33FD9),
    Uint64BE(0x9D765E41, 0x9FB69F6D), Uint64BE(0xD30C088B, 0xA61EA5EF), Uint64BE(0x5D94337F, 0xBFAF7F5B), Uint64BE(0x1A4E4822, 0xEB4D7A59),
    Uint64BE(0x6FFE73E8, 0x1B637FB3), Uint64BE(0xDDF957BC, 0x36D8B9CA), Uint64BE(0x64D0E29E, 0xEA8838B3), Uint64BE(0x08DD9BDF, 0xD96B9F63),
    Uint64BE(0x087E79E5, 0xA57D1D13), Uint64BE(0xE328E230, 0xE3E2B3FB), Uint64BE(0x1C2559E3, 0x0F0946BE), Uint64BE(0x720BF5F2, 0x6F4D2EAA),
    Uint64BE(0xB0774D26, 0x1CC609DB), Uint64BE(0x443F64EC, 0x5A371195), Uint64BE(0x4112CF68, 0x649A260E), Uint64BE(0xD813F2FA, 0xB7F5C5CA),
    Uint64BE(0x660D3257, 0x380841EE), Uint64BE(0x59AC2C78, 0x73F910A3), Uint64BE(0xE8469638, 0x77671A17), Uint64BE(0x93B633AB, 0xFA3469F8),
    Uint64BE(0xC0C0F5A6, 0x0EF4CDCF), Uint64BE(0xCAF21ECD, 0x4377B28C), Uint64BE(0x57277707, 0x199B8175), Uint64BE(0x506C11B9, 0xD90E8B1D),
    Uint64BE(0xD83CC268, 0x7A19255F), Uint64BE(0x4A29C646, 0x5A314CD1), Uint64BE(0xED2DF212, 0x16235097), Uint64BE(0xB5635C95, 0xFF7296E2),
    Uint64BE(0x22AF003A, 0xB672E811), Uint64BE(0x52E76259, 0x6BF68235), Uint64BE(0x9AEBA33A, 0xC6ECC6B0), Uint64BE(0x944F6DE0, 0x9134DFB6),
    Uint64BE(0x6C47BEC8, 0x83A7DE39), Uint64BE(0x6AD047C4, 0x30A12104), Uint64BE(0xA5B1CFDB, 0xA0AB4067), Uint64BE(0x7C45D833, 0xAFF07862),
    Uint64BE(0x5092EF95, 0x0A16DA0B), Uint64BE(0x9338E69C, 0x052B8E7B), Uint64BE(0x455A4B4C, 0xFE30E3F5), Uint64BE(0x6B02E631, 0x95AD0CF8),
    Uint64BE(0x6B17B224, 0xBAD6BF27), Uint64BE(0xD1E0CCD2, 0x5BB9C169), Uint64BE(0xDE0C89A5, 0x56B9AE70), Uint64BE(0x50065E53, 0x5A213CF6),
    Uint64BE(0x9C1169FA, 0x2777B874), Uint64BE(0x78EDEFD6, 0x94AF1EED), Uint64BE(0x6DC93D95, 0x26A50E68), Uint64BE(0xEE97F453, 0xF06791ED),
    Uint64BE(0x32AB0EDB, 0x696703D3), Uint64BE(0x3A6853C7, 0xE70757A7), Uint64BE(0x31865CED, 0x6120F37D), Uint64BE(0x67FEF95D, 0x92607890),
    Uint64BE(0x1F2B1D1F, 0x15F6DC9C), Uint64BE(0xB69E38A8, 0x965C6B65), Uint64BE(0xAA9119FF, 0x184CCCF4), Uint64BE(0xF43C7328, 0x73F24C13),
    Uint64BE(0xFB4A3D79, 0x4A9A80D2), Uint64BE(0x3550C232, 0x1FD6109C), Uint64BE(0x371F77E7, 0x6BB8417E), Uint64BE(0x6BFA9AAE, 0x5EC05779),
    Uint64BE(0xCD04F3FF, 0x001A4778), Uint64BE(0xE3273522, 0x064480CA), Uint64BE(0x9F91508B, 0xFFCFC14A), Uint64BE(0x049A7F41, 0x061A9E60),
    Uint64BE(0xFCB6BE43, 0xA9F2FE9B), Uint64BE(0x08DE8A1C, 0x7797DA9B), Uint64BE(0x8F9887E6, 0x078735A1), Uint64BE(0xB5B4071D, 0xBFC73A66),
    Uint64BE(0x230E343D, 0xFBA08D33), Uint64BE(0x43ED7F5A, 0x0FAE657D), Uint64BE(0x3A88A0FB, 0xBCB05C63), Uint64BE(0x21874B8B, 0x4D2DBC4F),
    Uint64BE(0x1BDEA12E, 0x35F6A8C9), Uint64BE(0x53C065C6, 0xC8E63528), Uint64BE(0xE34A1D25, 0x0E7A8D6B), Uint64BE(0xD6B04D3B, 0x7651DD7E),
    Uint64BE(0x5E90277E, 0x7CB39E2D), Uint64BE(0x2C046F22, 0x062DC67D), Uint64BE(0xB10BB459, 0x132D0A26), Uint64BE(0x3FA9DDFB, 0x67E2F199),
    Uint64BE(0x0E09B88E, 0x1914F7AF), Uint64BE(0x10E8B35A, 0xF3EEAB37), Uint64BE(0x9EEDECA8, 0xE272B933), Uint64BE(0xD4C718BC, 0x4AE8AE5F),
    Uint64BE(0x81536D60, 0x1170FC20), Uint64BE(0x91B534F8, 0x85818A06), Uint64BE(0xEC8177F8, 0x3F900978), Uint64BE(0x190E714F, 0xADA5156E),
    Uint64BE(0xB592BF39, 0xB0364963), Uint64BE(0x89C350C8, 0x93AE7DC1), Uint64BE(0xAC042E70, 0xF8B383F2), Uint64BE(0xB49B52E5, 0x87A1EE60),
    Uint64BE(0xFB152FE3, 0xFF26DA89), Uint64BE(0x3E666E6F, 0x69AE2C15), Uint64BE(0x3B544EBE, 0x544C19F9), Uint64BE(0xE805A1E2, 0x90CF2456),
    Uint64BE(0x24B33C9D, 0x7ED25117), Uint64BE(0xE7473342, 0x7B72F0C1), Uint64BE(0x0A804D18, 0xB7097475), Uint64BE(0x57E3306D, 0x881EDB4F),
    Uint64BE(0x4AE7D6A3, 0x6EB5DBCB), Uint64BE(0x2D8D5432, 0x157064C8), Uint64BE(0xD1E649DE, 0x1E7F268B), Uint64BE(0x8A328A1C, 0xEDFE552C),
    Uint64BE(0x07A3AEC7, 0x9624C7DA), Uint64BE(0x84547DDC, 0x3E203C94), Uint64BE(0x990A98FD, 0x5071D263), Uint64BE(0x1A4FF126, 0x16EEFC89),
    Uint64BE(0xF6F7FD14, 0x31714200), Uint64BE(0x30C05B1B, 0xA332F41C), Uint64BE(0x8D2636B8, 0x1555A786), Uint64BE(0x46C9FEB5, 0x5D120902),
    Uint64BE(0xCCEC0A73, 0xB49C9921), Uint64BE(0x4E9D2827, 0x355FC492), Uint64BE(0x19EBB029, 0x435DCB0F), Uint64BE(0x4659D2B7, 0x43848A2C),
    Uint64BE(0x963EF2C9, 0x6B33BE31), Uint64BE(0x74F85198, 0xB05A2E7D), Uint64BE(0x5A0F544D, 0xD2B1FB18), Uint64BE(0x03727073, 0xC2E134B1),
    Uint64BE(0xC7F6AA2D, 0xE59AEA61), Uint64BE(0x352787BA, 0xA0D7C22F), Uint64BE(0x9853EAB6, 0x3B5E0B35), Uint64BE(0xABBDCDD7, 0xED5C0860),
    Uint64BE(0xCF05DAF5, 0xAC8D77B0), Uint64BE(0x49CAD48C, 0xEBF4A71E), Uint64BE(0x7A4C10EC, 0x2158C4A6), Uint64BE(0xD9E92AA2, 0x46BF719E),
    Uint64BE(0x13AE978D, 0x09FE5557), Uint64BE(0x730499AF, 0x921549FF), Uint64BE(0x4E4B705B, 0x92903BA4), Uint64BE(0xFF577222, 0xC14F0A3A),
    Uint64BE(0x55B6344C, 0xF97AAFAE), Uint64BE(0xB862225B, 0x055B6960), Uint64BE(0xCAC09AFB, 0xDDD2CDB4), Uint64BE(0xDAF8E982, 0x9FE96B5F),
    Uint64BE(0xB5FDFC5D, 0x3132C498), Uint64BE(0x310CB380, 0xDB6F7503), Uint64BE(0xE87FBB46, 0x217A360E), Uint64BE(0x2102AE46, 0x6EBB1148),
    Uint64BE(0xF8549E1A, 0x3AA5E00D), Uint64BE(0x07A69AFD, 0xCC42261A), Uint64BE(0xC4C118BF, 0xE78FEAAE), Uint64BE(0xF9F4892E, 0xD96BD438),
    Uint64BE(0x1AF3DBE2, 0x5D8F45DA), Uint64BE(0xF5B4B0B0, 0xD2DEEEB4), Uint64BE(0x962ACEEF, 0xA82E1C84), Uint64BE(0x046E3ECA, 0xAF453CE9),
    Uint64BE(0xF05D1296, 0x81949A4C), Uint64BE(0x964781CE, 0x734B3C84), Uint64BE(0x9C2ED440, 0x81CE5FBD), Uint64BE(0x522E23F3, 0x925E319E),
    Uint64BE(0x177E00F9, 0xFC32F791), Uint64BE(0x2BC60A63, 0xA6F3B3F2), Uint64BE(0x222BBFAE, 0x61725606), Uint64BE(0x486289DD, 0xCC3D6780),
    Uint64BE(0x7DC7785B, 0x8EFDFC80), Uint64BE(0x8AF38731, 0xC02BA980), Uint64BE(0x1FAB64EA, 0x29A2DDF7), Uint64BE(0xE4D94293, 0x22CD065A),
    Uint64BE(0x9DA058C6, 0x7844F20C), Uint64BE(0x24C0E332, 0xB70019B0), Uint64BE(0x233003B5, 0xA6CFE6AD), Uint64BE(0xD586BD01, 0xC5C217F6),
    Uint64BE(0x5E563788, 0x5F29BC2B), Uint64BE(0x7EBA726D, 0x8C94094B), Uint64BE(0x0A56A5F0, 0xBFE39272), Uint64BE(0xD79476A8, 0x4EE20D06),
    Uint64BE(0x9E4C1269, 0xBAA4BF37), Uint64BE(0x17EFEE45, 0xB0DEE640), Uint64BE(0x1D95B0A5, 0xFCF90BC6), Uint64BE(0x93CBE0B6, 0x99C2585D),
    Uint64BE(0x65FA4F22, 0x7A2B6D79), Uint64BE(0xD5F9E858, 0x292504D5), Uint64BE(0xC2B5A03F, 0x71471A6F), Uint64BE(0x59300222, 0xB4561E00),
    Uint64BE(0xCE2F8642, 0xCA0712DC), Uint64BE(0x7CA9723F, 0xBB2E8988), Uint64BE(0x27853383, 0x47F2BA08), Uint64BE(0xC61BB3A1, 0x41E50E8C),
    Uint64BE(0x150F361D, 0xAB9DEC26), Uint64BE(0x9F6A419D, 0x382595F4), Uint64BE(0x64A53DC9, 0x24FE7AC9), Uint64BE(0x142DE49F, 0xFF7A7C3D),
    Uint64BE(0x0C335248, 0x857FA9E7), Uint64BE(0x0A9C32D5, 0xEAE45305), Uint64BE(0xE6C42178, 0xC4BBB92E), Uint64BE(0x71F1CE24, 0x90D20B07),
    Uint64BE(0xF1BCC3D2, 0x75AFE51A), Uint64BE(0xE728E8C8, 0x3C334074), Uint64BE(0x96FBF83A, 0x12884624), Uint64BE(0x81A1549F, 0xD6573DA5),
    Uint64BE(0x5FA7867C, 0xAF35E149), Uint64BE(0x56986E2E, 0xF3ED091B), Uint64BE(0x917F1DD5, 0xF8886C61), Uint64BE(0xD20D8C88, 0xC8FFE65F),
    Uint64BE(0x31D71DCE, 0x64B2C310), Uint64BE(0xF165B587, 0xDF898190), Uint64BE(0xA57E6339, 0xDD2CF3A0), Uint64BE(0x1EF6E6DB, 0xB1961EC9),
    Uint64BE(0x70CC73D9, 0x0BC26E24), Uint64BE(0xE21A6B35, 0xDF0C3AD7), Uint64BE(0x003A93D8, 0xB2806962), Uint64BE(0x1C99DED3, 0x3CB890A1),
    Uint64BE(0xCF3145DE, 0x0ADD4289), Uint64BE(0xD0E4427A, 0x5514FB72), Uint64BE(0x77C621CC, 0x9FB3A483), Uint64BE(0x67A34DAC, 0x4356550B),
    Uint64BE(0xF8D626AA, 0xAF278509),
];
module.exports.Random64 = Random64;
module.exports.RandomPiece = Random64.slice(0,768);
module.exports.RandomCastle = Random64.slice(768, 768+4);
module.exports.RandomEnPassant = Random64.slice(764, 764+4);
module.exports.RandomTurn = Random64.slice(780, 780+1);
module.exports.PromotionPieces = " nbrq".split("");
module.exports.encode_move = function (algebraic_move) {

}


module.exports.decode_move = function (move) {
  /*
  "move" is a bit field with the following meaning (bit 0 is the least significant bit)
  bits                meaning
  ===================================
  0,1,2               to file
  3,4,5               to row
  6,7,8               from file
  9,10,11             from row
  12,13,14            promotion piece
  */
  let moveStr = [];
  let from = (move >> 6) & parseInt('077',8);
  let fromRow = ((from >> 3) & 0x7 )+ 1;
  let fromFile = from & 0x7;
  let to = move & parseInt('077',8);
  let toRow = ((to >> 3) & 0x7) +1;
  let toFile = to & 0x7;
  let promotion = (move >> 12) & 0x7;
  if (fromFile) {
    moveStr[0] = files[fromFile];
  } else {
    moveStr[0] = 'a';
  }
    moveStr[1] = fromRow || '1';
  if (toFile) {
    moveStr[2] = files[toFile]
  } else {
    moveStr[2] = 'a';
  }
  moveStr[3] = toRow || '1';
  if (promotion) {
      moveStr[4] = PromotionPieces[promotion];
  }
  let decoded = moveStr.join("");
//Convert the castling moves to standard notation
  if (decoded == "e1h1") {
    return "e1g1";
  } else if (decoded ==  "e1a1") {
    return "e1c1";
  } else if (decoded ==  "e8h8") {
    return "e8g8";
  } else if (decoded == "e8a8") {
    return "e8c8";

  }

  if (decoded == "a1a1" ) {
      return "";
  }
  return decoded;
}

},{"../../utils.js":51,"int64-buffer":55}],49:[function(require,module,exports){
"use strict";
const { peiceTypes, Random64,  RandomPiece,RandomCastle, RandomEnPassant,RandomTurn,PromotionPieces,encode_move, decode_move} = require("./encoding.js")
const Uint64BE = require("int64-buffer").Uint64BE;
class PolyglotEntry {
    static fromBuffer(buffer) {
      let dataView = new DataView(buffer);
      let e = new PolyglotEntry();
      e._key = new Uint64BE(buffer.slice(0, 8)).toString(16);
      if (e._key.length < 16) {
        let pad = 16 - e._key.length;
        for (let x=0; x < pad; x++) {
          e._key = '0'+ e._key;
        }
  
      }
      e._encoded_move = dataView.getUint16(8, false);
      e._algebraic_move = decode_move(dataView.getUint16(8, false));
      e._weight = dataView.getUint16(10, false);
      e._learn = dataView.getUint32(12,false);
      return e;
    }
    static withFEN(fen, algebraic_move, weight, learn) {
      e._key = hash(fen);
      e.algebraic_move = algebraic_move;
      e.weight = weight;
      e.learn = learn;
    }
    constructor() {
  
    }
    get key() {
      return this._key;
    }
    get algebraic_move() {
      return this._algebraic_move;
    }
    get encoded_move() {
      return this._encoded_move;
    }
    set algebraic_move(move) {
      this._algebraic_move = move;
      this._encoded_move = encode_move(move);
    }
    get weight() {
      return this._weight;
    }
    set weight(weight) {
      this._weight = weight;
    }
    get learn() {
      return this._learn;
    }
    set learn(learn) {
      this._learn = learn;
    }
    toJSON() {
      return {
        key : this._key,
        aglebraic_move : this._aglebraic_move,
        encoded_move : this._encoded_move,
        weight : this._weight,
        learn : this._learn
      };
    }
    toString() {
      return JSON.stringify(this, null, " ");
    }
  }
  module.exports = PolyglotEntry;
},{"./encoding.js":48,"int64-buffer":55}],50:[function(require,module,exports){
(function (Buffer){
"use strict";
const Uint64BE = require("int64-buffer").Uint64BE;
const EventEmitter = require('events');
const Chess = require('chess.js').Chess;
const Transform = require('stream').Transform;
const utils = require("../../utils.js");
const files = utils.board.FILES;
const { peiceTypes, Random64,  RandomPiece,RandomCastle, RandomEnPassant,RandomTurn,PromotionPieces,encode_move, decode_move} = require("./encoding.js")
const PolyglotEntry = require("./entry.js");
class PolyglotStream extends Transform {
  constructor() {
   super({readableObjectMode : true });
 }
 // _flush(callback) {
 //   console.log("flush");
 //   callback();
 // }
 _transform(chunk, encoding, callback) {
   if (this._data) {
     this._data = Buffer.concat(this._data, chunk);
   } else {
     this._data = chunk;
   }
   let entries=[];
   if (this._data.length >= 16) {
     let i = 16;
     let remainder = this._data.length % 16;
     let extra_data;
     if (remainder > 0) {
       //take the last bit of the buffer and save it.
       extra_data = Buffer.from(this._data.buffer.slice(this._data.length-remainder, this._data.length));
     }
     for (i = 16; i < this._data.length; i = i + 16) {
       let b = this._data.buffer.slice(i-16,i);
       let entry = PolyglotEntry.fromBuffer(b);
       this.push(entry);

     }
    this._data = extra_data;
   }
   //this.push(entries);
   callback();
 }
}
class Polyglot extends EventEmitter {
  constructor() {
    super();
    this.loaded = false;
    this.entries = [];
    this.stream = new PolyglotStream();
  }
  load_book(stream) {
    this.entries = [];
    this.loaded = false;

    this.stream.on( "data", (entry)=>{
      if (!this.entries[entry.key]) {
        this.entries[entry.key] = [];
      }
      this.entries[entry.key].push(entry);
    });
    this.stream.on('finish', ()=>{
        this.loaded= true;
        this.emit("loaded");
    });
    this.stream.on('error', (error)=>{
      console.log("error", error);
      this.emit("error", error);
    })
    stream.pipe(this.stream);
  }
  find(fen) {
    if (!this.loaded) {
      throw new Error("No book is loaded")
    }
    let hash = this.generate_hash(fen);
    return this.entries[hash];
  }
  generate_hash(fen) {
    /**From the polyglot module **/
    return hash(fen);
  }
}
function xor_64uint(a, b) {
    let output;
    let a_view = new DataView(a.toArrayBuffer());
    let b_view = new DataView(b.toArrayBuffer());
    let a_32_hi = a_view.getUint32(0, false);
    let a_32_lo = a_view.getUint32(4, false);
    let b_32_hi = b_view.getUint32(0, false);
    let b_32_lo = b_view.getUint32(4, false);
    let n_hi = a_32_hi ^ b_32_hi;
    let n_lo = a_32_lo ^ b_32_lo;
    return Uint64BE(n_hi, n_lo);
}

function hash(fen) {
  let game = new Chess(fen);
  let result = game.validate_fen(fen);
  if (!result.valid) {
      throw result.error;
  }
  //Calculate piece offsets
  let pieceOffsets = [];
  for (let file = 0;file < 8;file++) {
      for (let rank = 1;rank <= 8;rank++) {
          let piece = game.get(files[file] + rank);
          if (piece) {
              pieceOffsets.push(64 * pieceTypes[piece.color + piece.type] + 8 * (rank - 1) + file);
          }
      }
  }
  //Calculate castling offsets
  let castlingOffsets = [];
  let fenTokens = game.fen().split(' ');
  let castlingField = fenTokens[2];
  if (castlingField.indexOf('K') != -1) {
      castlingOffsets.push(0);
  }
  if (castlingField.indexOf('Q') != -1) {
      castlingOffsets.push(1);
  }
  if (castlingField.indexOf('k') != -1) {
      castlingOffsets.push(2);
  }
  if (castlingField.indexOf('q') != -1) {
      castlingOffsets.push(3);
  }
  //Calculate enpassant offsets
  let epOffset = -1;
  let fenEpSquare = fenTokens[3];
  if (fenEpSquare !== '-') {
      fenEpSquare = fenEpSquare[0] + (game.turn() === 'w' ? '5' : '4');
      let epSquareIndex = files.indexOf(fenEpSquare[0]);
      if (epSquareIndex > 0) {
          let leftPiece = game.get(files[epSquareIndex - 1] + fenEpSquare[1]);
          if (leftPiece && leftPiece.type === 'p' &&
              leftPiece.color === game.turn()) {
              epOffset = epSquareIndex;
          }
      }
      if (epSquareIndex < 7) {
          let rightPiece = game.get(files[epSquareIndex + 1] + fenEpSquare[1]);
          if (rightPiece && rightPiece.type === 'p' &&
              rightPiece.color === game.turn()) {
              epOffset = epSquareIndex;
          }
      }
  }
  let isWhitesTurn = game.turn() === 'w';
  let fen_hash = Uint64BE(0);
  for (let offset of pieceOffsets) {
    fen_hash = xor_64uint(fen_hash, RandomPiece[offset]);
  }
  for (let offset of castlingOffsets) {
    fen_hash = xor_64uint(fen_hash,  RandomCastle[offset]);
  }
  if (epOffset >= 0) {
    fen_hash = xor_64uint(fen_hash, RandomEnPassant[epOffset]);
  }
  if (isWhitesTurn) {
    fen_hash = xor_64uint(fen_hash, RandomTurn[0]);
  }
  let output = fen_hash.toString(16);
  if (output.length < 16) {
    let pad = 16 - output.length;
    for (let x =0; x < pad; x++ )  {
      output = '0' + output;
    }
  }
  return output;
}
Polyglot.PolyglotStream = PolyglotStream;
Polyglot.PolyglotEntry = PolyglotEntry;
module.exports = Polyglot;

}).call(this,require("buffer").Buffer)
},{"../../utils.js":51,"./encoding.js":48,"./entry.js":49,"buffer":4,"chess.js":52,"events":6,"int64-buffer":55,"stream":27}],51:[function(require,module,exports){
(function (process){
"use strict";
module.exports.key_from_fen = function (fen) {
    return fen.split(" ").slice(0,4).join(" ");
}
module.exports.pad_number_string = function(str, expected_length) {
    if (str.length < expected_length) {
      let pad = expected_length - str.length;
      for (let x= 0; x < pad; x++) {
        str= '0'+str;
      } 
    }
    return str;
}
module.exports.debug_buffer_to_string = function(buffer) {
    let array = new Uint8Array(buffer);
    process.stdout.write("\nSTART_BUFFER_DUMP\n");
    for (let i = 0; i < array.length; i++) {
      if (i % 32 == 0) {
        process.stdout.write("\n");
      }
      process.stdout.write(to_hex_string(array[i]) + " ");
    }
    process.stdout.write("\nEND_BUFFER_DUMP\n");
  }
  function to_hex_string(number) {
    return "0x" + pad_number_string(number.toString(16), 2);
}
module.exports.board = {};
module.exports.board.FILES = "abcdefgh".split("");
module.exports.board.RANKS = "12345678".split("");
module.exports.board.BOARD_INDEX = {
  'a1' : 0,
  'a2' : 1,
  'a3' : 2,
  'a4' : 3,
  'a5' : 4,
  'a6' : 5,
  'a7' : 6,
  'a8' : 7,
  'b1' : 8,
  'b2' : 9,
  'b3' : 10,
  'b4' : 11,
  'b5' : 12,
  'b6' : 13,
  'b7' : 14,
  'b8' : 15,
  'c1' : 16,
  'c2' : 17,
  'c3' : 18,
  'c4' : 19,
  'c5' : 20,
  'c6' : 21,
  'c7' : 22,
  'c8' : 23,
  'd1' : 24,
  'd2' : 25,
  'd3' : 26,
  'd4' : 27,
  'd5' : 28,
  'd6' : 29,
  'd7' : 30,
  'd8' : 31,
  'e1' : 32,
  'e2' : 33,
  'e3' : 34,
  'e4' : 35,
  'e5' : 36,
  'e6' : 37,
  'e7' : 38,
  'e8' : 39,
  'f1' : 40,
  'f2' : 41,
  'f3' : 42,
  'f4' : 43,
  'f5' : 44,
  'f6' : 45,
  'f7' : 46,
  'f8' : 47,
  'g1' : 48,
  'g2' : 49,
  'g3' : 50,
  'g4' : 51,
  'g5' : 52,
  'g6' : 53,
  'g7' : 54,
  'g8' : 55,
  'h1' : 56,
  'h2' : 57,
  'h3' : 58,
  'h4' : 59,
  'h5' : 60,
  'h6' : 61,
  'h7' : 62,
  'h8' : 63
};

module.exports.board.FLIP_BOARD = {
  'a1' : 'a8',
  'a2' : 'a7',
  'a3' : 'a6',
  'a4' : 'a5',
  'a5' : 'a4',
  'a6' : 'a3',
  'a7' : 'a2',
  'a8' : 'a1',
  'b1' : 'b8',
  'b2' : 'b7',
  'b3' : 'b6',
  'b4' : 'b5',
  'b5' : 'b4',
  'b6' : 'b3',
  'b7' : 'b2',
  'b8' : 'b1',
  'c1' : 'c8',
  'c2' : 'c7',
  'c3' : 'c6',
  'c4' : 'c5',
  'c5' : 'c4',
  'c6' : 'c3',
  'c7' : 'c2',
  'c8' : 'c1',
  'd1' : 'd8',
  'd2' : 'd7',
  'd3' : 'd6',
  'd4' : 'd5',
  'd5' : 'd4',
  'd6' : 'd3',
  'd7' : 'd2',
  'd8' : 'd1',
  'e1' : 'e8',
  'e2' : 'e7',
  'e3' : 'e6',
  'e4' : 'e5',
  'e5' : 'e4',
  'e6' : 'e3',
  'e7' : 'e2',
  'e8' : 'e1',
  'f1' : 'f8',
  'f2' : 'f7',
  'f3' : 'f6',
  'f4' : 'f5',
  'f5' : 'f4',
  'f6' : 'f3',
  'f7' : 'f2',
  'f8' : 'f1',
  'g1' : 'g8',
  'g2' : 'g7',
  'g3' : 'g6',
  'g4' : 'g5',
  'g5' : 'g4',
  'g6' : 'g3',
  'g7' : 'g2',
  'g8' : 'g1',
  'h1' : 'h8',
  'h2' : 'h7',
  'h3' : 'h6',
  'h4' : 'h5',
  'h5' : 'h4',
  'h6' : 'h3',
  'h7' : 'h2',
  'h8' : 'h1',
}
module.exports.board.MIRROR_FILE = {
  'a' : 'h',
  'b' : 'g',
  'c' : 'f',
  'd' : 'e',
  'e' : 'd',
  'f' : 'c',
  'g' : 'b',
  'h' : 'a'
};
}).call(this,require('_process'))
},{"_process":12}],52:[function(require,module,exports){
/*
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 *----------------------------------------------------------------------------*/

/* minified license below  */

/* @license
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the BSD license
 * https://github.com/jhlywa/chess.js/blob/master/LICENSE
 */

var Chess = function(fen) {

  /* jshint indent: false */

  var BLACK = 'b';
  var WHITE = 'w';

  var EMPTY = -1;

  var PAWN = 'p';
  var KNIGHT = 'n';
  var BISHOP = 'b';
  var ROOK = 'r';
  var QUEEN = 'q';
  var KING = 'k';

  var SYMBOLS = 'pnbrqkPNBRQK';

  var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var POSSIBLE_RESULTS = ['1-0', '0-1', '1/2-1/2', '*'];

  var PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15]
  };

  var PIECE_OFFSETS = {
    n: [-18, -33, -31, -14,  18, 33, 31,  14],
    b: [-17, -15,  17,  15],
    r: [-16,   1,  16,  -1],
    q: [-17, -16, -15,   1,  17, 16, 15,  -1],
    k: [-17, -16, -15,   1,  17, 16, 15,  -1]
  };

  var ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24,24,24,24,24,24,56,  0, 56,24,24,24,24,24,24, 0,
     0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
     0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
     0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
     0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
     0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20
  ];

  var RAYS = [
     17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
      0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
      0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
      0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
      0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
      1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
      0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
      0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
      0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
      0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
      0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
    -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17
  ];

  var SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

  var FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q'
  };

  var BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64
  };

  var RANK_1 = 7;
  var RANK_2 = 6;
  var RANK_3 = 5;
  var RANK_4 = 4;
  var RANK_5 = 3;
  var RANK_6 = 2;
  var RANK_7 = 1;
  var RANK_8 = 0;

  var SQUARES = {
    a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
    a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
    a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
    a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
    a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
    a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
    a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
  };

  var ROOKS = {
    w: [{square: SQUARES.a1, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h1, flag: BITS.KSIDE_CASTLE}],
    b: [{square: SQUARES.a8, flag: BITS.QSIDE_CASTLE},
        {square: SQUARES.h8, flag: BITS.KSIDE_CASTLE}]
  };

  var board = new Array(128);
  var kings = {w: EMPTY, b: EMPTY};
  var turn = WHITE;
  var castling = {w: 0, b: 0};
  var ep_square = EMPTY;
  var half_moves = 0;
  var move_number = 1;
  var history = [];
  var header = {};

  /* if the user passes in a fen string, load it, else default to
   * starting position
   */
  if (typeof fen === 'undefined') {
    load(DEFAULT_POSITION);
  } else {
    load(fen);
  }

  function clear() {
    board = new Array(128);
    kings = {w: EMPTY, b: EMPTY};
    turn = WHITE;
    castling = {w: 0, b: 0};
    ep_square = EMPTY;
    half_moves = 0;
    move_number = 1;
    history = [];
    header = {};
    update_setup(generate_fen());
  }

  function reset() {
    load(DEFAULT_POSITION);
  }

  function load(fen) {
    var tokens = fen.split(/\s+/);
    var position = tokens[0];
    var square = 0;

    if (!validate_fen(fen).valid) {
      return false;
    }

    clear();

    for (var i = 0; i < position.length; i++) {
      var piece = position.charAt(i);

      if (piece === '/') {
        square += 8;
      } else if (is_digit(piece)) {
        square += parseInt(piece, 10);
      } else {
        var color = (piece < 'a') ? WHITE : BLACK;
        put({type: piece.toLowerCase(), color: color}, algebraic(square));
        square++;
      }
    }

    turn = tokens[1];

    if (tokens[2].indexOf('K') > -1) {
      castling.w |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('Q') > -1) {
      castling.w |= BITS.QSIDE_CASTLE;
    }
    if (tokens[2].indexOf('k') > -1) {
      castling.b |= BITS.KSIDE_CASTLE;
    }
    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE;
    }

    ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
    half_moves = parseInt(tokens[4], 10);
    move_number = parseInt(tokens[5], 10);

    update_setup(generate_fen());

    return true;
  }

  /* TODO: this function is pretty much crap - it validates structure but
   * completely ignores content (e.g. doesn't verify that each side has a king)
   * ... we should rewrite this, and ditch the silly error_number field while
   * we're at it
   */
  function validate_fen(fen) {
    var errors = {
       0: 'No errors.',
       1: 'FEN string must contain six space-delimited fields.',
       2: '6th field (move number) must be a positive integer.',
       3: '5th field (half move counter) must be a non-negative integer.',
       4: '4th field (en-passant square) is invalid.',
       5: '3rd field (castling availability) is invalid.',
       6: '2nd field (side to move) is invalid.',
       7: '1st field (piece positions) does not contain 8 \'/\'-delimited rows.',
       8: '1st field (piece positions) is invalid [consecutive numbers].',
       9: '1st field (piece positions) is invalid [invalid piece].',
      10: '1st field (piece positions) is invalid [row too large].',
      11: 'Illegal en-passant square',
    };

    /* 1st criterion: 6 space-seperated fields? */
    var tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
      return {valid: false, error_number: 1, error: errors[1]};
    }

    /* 2nd criterion: move number field is a integer value > 0? */
    if (isNaN(tokens[5]) || (parseInt(tokens[5], 10) <= 0)) {
      return {valid: false, error_number: 2, error: errors[2]};
    }

    /* 3rd criterion: half move counter is an integer >= 0? */
    if (isNaN(tokens[4]) || (parseInt(tokens[4], 10) < 0)) {
      return {valid: false, error_number: 3, error: errors[3]};
    }

    /* 4th criterion: 4th field is a valid e.p.-string? */
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
      return {valid: false, error_number: 4, error: errors[4]};
    }

    /* 5th criterion: 3th field is a valid castle-string? */
    if( !/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])) {
      return {valid: false, error_number: 5, error: errors[5]};
    }

    /* 6th criterion: 2nd field is "w" (white) or "b" (black)? */
    if (!/^(w|b)$/.test(tokens[1])) {
      return {valid: false, error_number: 6, error: errors[6]};
    }

    /* 7th criterion: 1st field contains 8 rows? */
    var rows = tokens[0].split('/');
    if (rows.length !== 8) {
      return {valid: false, error_number: 7, error: errors[7]};
    }

    /* 8th criterion: every row is valid? */
    for (var i = 0; i < rows.length; i++) {
      /* check for right sum of fields AND not two numbers in succession */
      var sum_fields = 0;
      var previous_was_number = false;

      for (var k = 0; k < rows[i].length; k++) {
        if (!isNaN(rows[i][k])) {
          if (previous_was_number) {
            return {valid: false, error_number: 8, error: errors[8]};
          }
          sum_fields += parseInt(rows[i][k], 10);
          previous_was_number = true;
        } else {
          if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
            return {valid: false, error_number: 9, error: errors[9]};
          }
          sum_fields += 1;
          previous_was_number = false;
        }
      }
      if (sum_fields !== 8) {
        return {valid: false, error_number: 10, error: errors[10]};
      }
    }

    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
          return {valid: false, error_number: 11, error: errors[11]};
    }

    /* everything's okay! */
    return {valid: true, error_number: 0, error: errors[0]};
  }

  function generate_fen() {
    var empty = 0;
    var fen = '';

    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      if (board[i] == null) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        var color = board[i].color;
        var piece = board[i].type;

        fen += (color === WHITE) ?
                 piece.toUpperCase() : piece.toLowerCase();
      }

      if ((i + 1) & 0x88) {
        if (empty > 0) {
          fen += empty;
        }

        if (i !== SQUARES.h1) {
          fen += '/';
        }

        empty = 0;
        i += 8;
      }
    }

    var cflags = '';
    if (castling[WHITE] & BITS.KSIDE_CASTLE) { cflags += 'K'; }
    if (castling[WHITE] & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
    if (castling[BLACK] & BITS.KSIDE_CASTLE) { cflags += 'k'; }
    if (castling[BLACK] & BITS.QSIDE_CASTLE) { cflags += 'q'; }

    /* do we have an empty castling flag? */
    cflags = cflags || '-';
    var epflags = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

    return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
  }

  function set_header(args) {
    for (var i = 0; i < args.length; i += 2) {
      if (typeof args[i] === 'string' &&
          typeof args[i + 1] === 'string') {
        header[args[i]] = args[i + 1];
      }
    }
    return header;
  }

  /* called when the initial board setup is changed with put() or remove().
   * modifies the SetUp and FEN properties of the header object.  if the FEN is
   * equal to the default position, the SetUp and FEN are deleted
   * the setup is only updated if history.length is zero, ie moves haven't been
   * made.
   */
  function update_setup(fen) {
    if (history.length > 0) return;

    if (fen !== DEFAULT_POSITION) {
      header['SetUp'] = '1';
      header['FEN'] = fen;
    } else {
      delete header['SetUp'];
      delete header['FEN'];
    }
  }

  function get(square) {
    var piece = board[SQUARES[square]];
    return (piece) ? {type: piece.type, color: piece.color} : null;
  }

  function put(piece, square) {
    /* check for valid piece object */
    if (!('type' in piece && 'color' in piece)) {
      return false;
    }

    /* check for piece */
    if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
      return false;
    }

    /* check for valid square */
    if (!(square in SQUARES)) {
      return false;
    }

    var sq = SQUARES[square];

    /* don't let the user place more than one king */
    if (piece.type == KING &&
        !(kings[piece.color] == EMPTY || kings[piece.color] == sq)) {
      return false;
    }

    board[sq] = {type: piece.type, color: piece.color};
    if (piece.type === KING) {
      kings[piece.color] = sq;
    }

    update_setup(generate_fen());

    return true;
  }

  function remove(square) {
    var piece = get(square);
    board[SQUARES[square]] = null;
    if (piece && piece.type === KING) {
      kings[piece.color] = EMPTY;
    }

    update_setup(generate_fen());

    return piece;
  }

  function build_move(board, from, to, flags, promotion) {
    var move = {
      color: turn,
      from: from,
      to: to,
      flags: flags,
      piece: board[from].type
    };

    if (promotion) {
      move.flags |= BITS.PROMOTION;
      move.promotion = promotion;
    }

    if (board[to]) {
      move.captured = board[to].type;
    } else if (flags & BITS.EP_CAPTURE) {
        move.captured = PAWN;
    }
    return move;
  }

  function generate_moves(options) {
    function add_move(board, moves, from, to, flags) {
      /* if pawn promotion */
      if (board[from].type === PAWN &&
         (rank(to) === RANK_8 || rank(to) === RANK_1)) {
          var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
          for (var i = 0, len = pieces.length; i < len; i++) {
            moves.push(build_move(board, from, to, flags, pieces[i]));
          }
      } else {
       moves.push(build_move(board, from, to, flags));
      }
    }

    var moves = [];
    var us = turn;
    var them = swap_color(us);
    var second_rank = {b: RANK_7, w: RANK_2};

    var first_sq = SQUARES.a8;
    var last_sq = SQUARES.h1;
    var single_square = false;

    /* do we want legal moves? */
    var legal = (typeof options !== 'undefined' && 'legal' in options) ?
                options.legal : true;

    /* are we generating moves for a single square? */
    if (typeof options !== 'undefined' && 'square' in options) {
      if (options.square in SQUARES) {
        first_sq = last_sq = SQUARES[options.square];
        single_square = true;
      } else {
        /* invalid square */
        return [];
      }
    }

    for (var i = first_sq; i <= last_sq; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece == null || piece.color !== us) {
        continue;
      }

      if (piece.type === PAWN) {
        /* single square, non-capturing */
        var square = i + PAWN_OFFSETS[us][0];
        if (board[square] == null) {
            add_move(board, moves, i, square, BITS.NORMAL);

          /* double square */
          var square = i + PAWN_OFFSETS[us][1];
          if (second_rank[us] === rank(i) && board[square] == null) {
            add_move(board, moves, i, square, BITS.BIG_PAWN);
          }
        }

        /* pawn captures */
        for (j = 2; j < 4; j++) {
          var square = i + PAWN_OFFSETS[us][j];
          if (square & 0x88) continue;

          if (board[square] != null &&
              board[square].color === them) {
              add_move(board, moves, i, square, BITS.CAPTURE);
          } else if (square === ep_square) {
              add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
          }
        }
      } else {
        for (var j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
          var offset = PIECE_OFFSETS[piece.type][j];
          var square = i;

          while (true) {
            square += offset;
            if (square & 0x88) break;

            if (board[square] == null) {
              add_move(board, moves, i, square, BITS.NORMAL);
            } else {
              if (board[square].color === us) break;
              add_move(board, moves, i, square, BITS.CAPTURE);
              break;
            }

            /* break, if knight or king */
            if (piece.type === 'n' || piece.type === 'k') break;
          }
        }
      }
    }

    /* check for castling if: a) we're generating all moves, or b) we're doing
     * single square move generation on the king's square
     */
    if ((!single_square) || last_sq === kings[us]) {
      /* king-side castling */
      if (castling[us] & BITS.KSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from + 2;

        if (board[castling_from + 1] == null &&
            board[castling_to]       == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from + 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us] , castling_to,
                   BITS.KSIDE_CASTLE);
        }
      }

      /* queen-side castling */
      if (castling[us] & BITS.QSIDE_CASTLE) {
        var castling_from = kings[us];
        var castling_to = castling_from - 2;

        if (board[castling_from - 1] == null &&
            board[castling_from - 2] == null &&
            board[castling_from - 3] == null &&
            !attacked(them, kings[us]) &&
            !attacked(them, castling_from - 1) &&
            !attacked(them, castling_to)) {
          add_move(board, moves, kings[us], castling_to,
                   BITS.QSIDE_CASTLE);
        }
      }
    }

    /* return all pseudo-legal moves (this includes moves that allow the king
     * to be captured)
     */
    if (!legal) {
      return moves;
    }

    /* filter out illegal moves */
    var legal_moves = [];
    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(us)) {
        legal_moves.push(moves[i]);
      }
      undo_move();
    }

    return legal_moves;
  }

  /* convert a move from 0x88 coordinates to Standard Algebraic Notation
   * (SAN)
   *
   * @param {boolean} sloppy Use the sloppy SAN generator to work around over
   * disambiguation bugs in Fritz and Chessbase.  See below:
   *
   * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
   * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
   * 4. ... Ne7 is technically the valid SAN
   */
  function move_to_san(move, sloppy) {

    var output = '';

    if (move.flags & BITS.KSIDE_CASTLE) {
      output = 'O-O';
    } else if (move.flags & BITS.QSIDE_CASTLE) {
      output = 'O-O-O';
    } else {
      var disambiguator = get_disambiguator(move, sloppy);

      if (move.piece !== PAWN) {
        output += move.piece.toUpperCase() + disambiguator;
      }

      if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
        if (move.piece === PAWN) {
          output += algebraic(move.from)[0];
        }
        output += 'x';
      }

      output += algebraic(move.to);

      if (move.flags & BITS.PROMOTION) {
        output += '=' + move.promotion.toUpperCase();
      }
    }

    make_move(move);
    if (in_check()) {
      if (in_checkmate()) {
        output += '#';
      } else {
        output += '+';
      }
    }
    undo_move();

    return output;
  }

  // parses all of the decorators out of a SAN string
  function stripped_san(move) {
    return move.replace(/=/,'').replace(/[+#]?[?!]*$/,'');
  }

  function attacked(color, square) {
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* did we run off the end of the board */
      if (i & 0x88) { i += 7; continue; }

      /* if empty square or wrong color */
      if (board[i] == null || board[i].color !== color) continue;

      var piece = board[i];
      var difference = i - square;
      var index = difference + 119;

      if (ATTACKS[index] & (1 << SHIFTS[piece.type])) {
        if (piece.type === PAWN) {
          if (difference > 0) {
            if (piece.color === WHITE) return true;
          } else {
            if (piece.color === BLACK) return true;
          }
          continue;
        }

        /* if the piece is a knight or a king */
        if (piece.type === 'n' || piece.type === 'k') return true;

        var offset = RAYS[index];
        var j = i + offset;

        var blocked = false;
        while (j !== square) {
          if (board[j] != null) { blocked = true; break; }
          j += offset;
        }

        if (!blocked) return true;
      }
    }

    return false;
  }

  function king_attacked(color) {
    return attacked(swap_color(color), kings[color]);
  }

  function in_check() {
    return king_attacked(turn);
  }

  function in_checkmate() {
    return in_check() && generate_moves().length === 0;
  }

  function in_stalemate() {
    return !in_check() && generate_moves().length === 0;
  }

  function insufficient_material() {
    var pieces = {};
    var bishops = [];
    var num_pieces = 0;
    var sq_color = 0;

    for (var i = SQUARES.a8; i<= SQUARES.h1; i++) {
      sq_color = (sq_color + 1) % 2;
      if (i & 0x88) { i += 7; continue; }

      var piece = board[i];
      if (piece) {
        pieces[piece.type] = (piece.type in pieces) ?
                              pieces[piece.type] + 1 : 1;
        if (piece.type === BISHOP) {
          bishops.push(sq_color);
        }
        num_pieces++;
      }
    }

    /* k vs. k */
    if (num_pieces === 2) { return true; }

    /* k vs. kn .... or .... k vs. kb */
    else if (num_pieces === 3 && (pieces[BISHOP] === 1 ||
                                 pieces[KNIGHT] === 1)) { return true; }

    /* kb vs. kb where any number of bishops are all on the same color */
    else if (num_pieces === pieces[BISHOP] + 2) {
      var sum = 0;
      var len = bishops.length;
      for (var i = 0; i < len; i++) {
        sum += bishops[i];
      }
      if (sum === 0 || sum === len) { return true; }
    }

    return false;
  }

  function in_threefold_repetition() {
    /* TODO: while this function is fine for casual use, a better
     * implementation would use a Zobrist key (instead of FEN). the
     * Zobrist key would be maintained in the make_move/undo_move functions,
     * avoiding the costly that we do below.
     */
    var moves = [];
    var positions = {};
    var repetition = false;

    while (true) {
      var move = undo_move();
      if (!move) break;
      moves.push(move);
    }

    while (true) {
      /* remove the last two fields in the FEN string, they're not needed
       * when checking for draw by rep */
      var fen = generate_fen().split(' ').slice(0,4).join(' ');

      /* has the position occurred three or move times */
      positions[fen] = (fen in positions) ? positions[fen] + 1 : 1;
      if (positions[fen] >= 3) {
        repetition = true;
      }

      if (!moves.length) {
        break;
      }
      make_move(moves.pop());
    }

    return repetition;
  }

  function push(move) {
    history.push({
      move: move,
      kings: {b: kings.b, w: kings.w},
      turn: turn,
      castling: {b: castling.b, w: castling.w},
      ep_square: ep_square,
      half_moves: half_moves,
      move_number: move_number
    });
  }

  function make_move(move) {
    var us = turn;
    var them = swap_color(us);
    push(move);

    board[move.to] = board[move.from];
    board[move.from] = null;

    /* if ep capture, remove the captured pawn */
    if (move.flags & BITS.EP_CAPTURE) {
      if (turn === BLACK) {
        board[move.to - 16] = null;
      } else {
        board[move.to + 16] = null;
      }
    }

    /* if pawn promotion, replace with new piece */
    if (move.flags & BITS.PROMOTION) {
      board[move.to] = {type: move.promotion, color: us};
    }

    /* if we moved the king */
    if (board[move.to].type === KING) {
      kings[board[move.to].color] = move.to;

      /* if we castled, move the rook next to the king */
      if (move.flags & BITS.KSIDE_CASTLE) {
        var castling_to = move.to - 1;
        var castling_from = move.to + 1;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        var castling_to = move.to + 1;
        var castling_from = move.to - 2;
        board[castling_to] = board[castling_from];
        board[castling_from] = null;
      }

      /* turn off castling */
      castling[us] = '';
    }

    /* turn off castling if we move a rook */
    if (castling[us]) {
      for (var i = 0, len = ROOKS[us].length; i < len; i++) {
        if (move.from === ROOKS[us][i].square &&
            castling[us] & ROOKS[us][i].flag) {
          castling[us] ^= ROOKS[us][i].flag;
          break;
        }
      }
    }

    /* turn off castling if we capture a rook */
    if (castling[them]) {
      for (var i = 0, len = ROOKS[them].length; i < len; i++) {
        if (move.to === ROOKS[them][i].square &&
            castling[them] & ROOKS[them][i].flag) {
          castling[them] ^= ROOKS[them][i].flag;
          break;
        }
      }
    }

    /* if big pawn move, update the en passant square */
    if (move.flags & BITS.BIG_PAWN) {
      if (turn === 'b') {
        ep_square = move.to - 16;
      } else {
        ep_square = move.to + 16;
      }
    } else {
      ep_square = EMPTY;
    }

    /* reset the 50 move counter if a pawn is moved or a piece is captured */
    if (move.piece === PAWN) {
      half_moves = 0;
    } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
      half_moves = 0;
    } else {
      half_moves++;
    }

    if (turn === BLACK) {
      move_number++;
    }
    turn = swap_color(turn);
  }

  function undo_move() {
    var old = history.pop();
    if (old == null) { return null; }

    var move = old.move;
    kings = old.kings;
    turn = old.turn;
    castling = old.castling;
    ep_square = old.ep_square;
    half_moves = old.half_moves;
    move_number = old.move_number;

    var us = turn;
    var them = swap_color(turn);

    board[move.from] = board[move.to];
    board[move.from].type = move.piece;  // to undo any promotions
    board[move.to] = null;

    if (move.flags & BITS.CAPTURE) {
      board[move.to] = {type: move.captured, color: them};
    } else if (move.flags & BITS.EP_CAPTURE) {
      var index;
      if (us === BLACK) {
        index = move.to - 16;
      } else {
        index = move.to + 16;
      }
      board[index] = {type: PAWN, color: them};
    }


    if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
      var castling_to, castling_from;
      if (move.flags & BITS.KSIDE_CASTLE) {
        castling_to = move.to + 1;
        castling_from = move.to - 1;
      } else if (move.flags & BITS.QSIDE_CASTLE) {
        castling_to = move.to - 2;
        castling_from = move.to + 1;
      }

      board[castling_to] = board[castling_from];
      board[castling_from] = null;
    }

    return move;
  }

  /* this function is used to uniquely identify ambiguous moves */
  function get_disambiguator(move, sloppy) {
    var moves = generate_moves({legal: !sloppy});

    var from = move.from;
    var to = move.to;
    var piece = move.piece;

    var ambiguities = 0;
    var same_rank = 0;
    var same_file = 0;

    for (var i = 0, len = moves.length; i < len; i++) {
      var ambig_from = moves[i].from;
      var ambig_to = moves[i].to;
      var ambig_piece = moves[i].piece;

      /* if a move of the same piece type ends on the same to square, we'll
       * need to add a disambiguator to the algebraic notation
       */
      if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
        ambiguities++;

        if (rank(from) === rank(ambig_from)) {
          same_rank++;
        }

        if (file(from) === file(ambig_from)) {
          same_file++;
        }
      }
    }

    if (ambiguities > 0) {
      /* if there exists a similar moving piece on the same rank and file as
       * the move in question, use the square as the disambiguator
       */
      if (same_rank > 0 && same_file > 0) {
        return algebraic(from);
      }
      /* if the moving piece rests on the same file, use the rank symbol as the
       * disambiguator
       */
      else if (same_file > 0) {
        return algebraic(from).charAt(1);
      }
      /* else use the file symbol */
      else {
        return algebraic(from).charAt(0);
      }
    }

    return '';
  }

  function ascii() {
    var s = '   +------------------------+\n';
    for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
      /* display the rank */
      if (file(i) === 0) {
        s += ' ' + '87654321'[rank(i)] + ' |';
      }

      /* empty piece */
      if (board[i] == null) {
        s += ' . ';
      } else {
        var piece = board[i].type;
        var color = board[i].color;
        var symbol = (color === WHITE) ?
                     piece.toUpperCase() : piece.toLowerCase();
        s += ' ' + symbol + ' ';
      }

      if ((i + 1) & 0x88) {
        s += '|\n';
        i += 8;
      }
    }
    s += '   +------------------------+\n';
    s += '     a  b  c  d  e  f  g  h\n';

    return s;
  }

  // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
  function move_from_san(move, sloppy) {
    // strip off any move decorations: e.g Nf3+?!
    var clean_move = stripped_san(move);

    // if we're using the sloppy parser run a regex to grab piece, to, and from
    // this should parse invalid SAN like: Pe2-e4, Rc1c4, Qf3xf7
    if (sloppy) {
      var matches = clean_move.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
      if (matches) {
        var piece = matches[1];
        var from = matches[2];
        var to = matches[3];
        var promotion = matches[4];
      }
    }

    var moves = generate_moves();
    for (var i = 0, len = moves.length; i < len; i++) {
      // try the strict parser first, then the sloppy parser if requested
      // by the user
      if ((clean_move === stripped_san(move_to_san(moves[i]))) ||
          (sloppy && clean_move === stripped_san(move_to_san(moves[i], true)))) {
        return moves[i];
      } else {
        if (matches &&
            (!piece || piece.toLowerCase() == moves[i].piece) &&
            SQUARES[from] == moves[i].from &&
            SQUARES[to] == moves[i].to &&
            (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
          return moves[i];
        }
      }
    }

    return null;
  }


  /*****************************************************************************
   * UTILITY FUNCTIONS
   ****************************************************************************/
  function rank(i) {
    return i >> 4;
  }

  function file(i) {
    return i & 15;
  }

  function algebraic(i){
    var f = file(i), r = rank(i);
    return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
  }

  function swap_color(c) {
    return c === WHITE ? BLACK : WHITE;
  }

  function is_digit(c) {
    return '0123456789'.indexOf(c) !== -1;
  }

  /* pretty = external move object */
  function make_pretty(ugly_move) {
    var move = clone(ugly_move);
    move.san = move_to_san(move, false);
    move.to = algebraic(move.to);
    move.from = algebraic(move.from);

    var flags = '';

    for (var flag in BITS) {
      if (BITS[flag] & move.flags) {
        flags += FLAGS[flag];
      }
    }
    move.flags = flags;

    return move;
  }

  function clone(obj) {
    var dupe = (obj instanceof Array) ? [] : {};

    for (var property in obj) {
      if (typeof property === 'object') {
        dupe[property] = clone(obj[property]);
      } else {
        dupe[property] = obj[property];
      }
    }

    return dupe;
  }

  function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
  }

  /*****************************************************************************
   * DEBUGGING UTILITIES
   ****************************************************************************/
  function perft(depth) {
    var moves = generate_moves({legal: false});
    var nodes = 0;
    var color = turn;

    for (var i = 0, len = moves.length; i < len; i++) {
      make_move(moves[i]);
      if (!king_attacked(color)) {
        if (depth - 1 > 0) {
          var child_nodes = perft(depth - 1);
          nodes += child_nodes;
        } else {
          nodes++;
        }
      }
      undo_move();
    }

    return nodes;
  }

  return {
    /***************************************************************************
     * PUBLIC CONSTANTS (is there a better way to do this?)
     **************************************************************************/
    WHITE: WHITE,
    BLACK: BLACK,
    PAWN: PAWN,
    KNIGHT: KNIGHT,
    BISHOP: BISHOP,
    ROOK: ROOK,
    QUEEN: QUEEN,
    KING: KING,
    SQUARES: (function() {
                /* from the ECMA-262 spec (section 12.6.4):
                 * "The mechanics of enumerating the properties ... is
                 * implementation dependent"
                 * so: for (var sq in SQUARES) { keys.push(sq); } might not be
                 * ordered correctly
                 */
                var keys = [];
                for (var i = SQUARES.a8; i <= SQUARES.h1; i++) {
                  if (i & 0x88) { i += 7; continue; }
                  keys.push(algebraic(i));
                }
                return keys;
              })(),
    FLAGS: FLAGS,

    /***************************************************************************
     * PUBLIC API
     **************************************************************************/
    load: function(fen) {
      return load(fen);
    },

    reset: function() {
      return reset();
    },

    moves: function(options) {
      /* The internal representation of a chess move is in 0x88 format, and
       * not meant to be human-readable.  The code below converts the 0x88
       * square coordinates to algebraic coordinates.  It also prunes an
       * unnecessary move keys resulting from a verbose call.
       */

      var ugly_moves = generate_moves(options);
      var moves = [];

      for (var i = 0, len = ugly_moves.length; i < len; i++) {

        /* does the user want a full move object (most likely not), or just
         * SAN
         */
        if (typeof options !== 'undefined' && 'verbose' in options &&
            options.verbose) {
          moves.push(make_pretty(ugly_moves[i]));
        } else {
          moves.push(move_to_san(ugly_moves[i], false));
        }
      }

      return moves;
    },

    in_check: function() {
      return in_check();
    },

    in_checkmate: function() {
      return in_checkmate();
    },

    in_stalemate: function() {
      return in_stalemate();
    },

    in_draw: function() {
      return half_moves >= 100 ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    insufficient_material: function() {
      return insufficient_material();
    },

    in_threefold_repetition: function() {
      return in_threefold_repetition();
    },

    game_over: function() {
      return half_moves >= 100 ||
             in_checkmate() ||
             in_stalemate() ||
             insufficient_material() ||
             in_threefold_repetition();
    },

    validate_fen: function(fen) {
      return validate_fen(fen);
    },

    fen: function() {
      return generate_fen();
    },

    pgn: function(options) {
      /* using the specification from http://www.chessclub.com/help/PGN-spec
       * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
       */
      var newline = (typeof options === 'object' &&
                     typeof options.newline_char === 'string') ?
                     options.newline_char : '\n';
      var max_width = (typeof options === 'object' &&
                       typeof options.max_width === 'number') ?
                       options.max_width : 0;
      var result = [];
      var header_exists = false;

      /* add the PGN header headerrmation */
      for (var i in header) {
        /* TODO: order of enumerated properties in header object is not
         * guaranteed, see ECMA-262 spec (section 12.6.4)
         */
        result.push('[' + i + ' \"' + header[i] + '\"]' + newline);
        header_exists = true;
      }

      if (header_exists && history.length) {
        result.push(newline);
      }

      /* pop all of history onto reversed_history */
      var reversed_history = [];
      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      var moves = [];
      var move_string = '';

      /* build the list of moves.  a move_string looks like: "3. e3 e6" */
      while (reversed_history.length > 0) {
        var move = reversed_history.pop();

        /* if the position started with black to move, start PGN with 1. ... */
        if (!history.length && move.color === 'b') {
          move_string = move_number + '. ...';
        } else if (move.color === 'w') {
          /* store the previous generated move_string if we have one */
          if (move_string.length) {
            moves.push(move_string);
          }
          move_string = move_number + '.';
        }

        move_string = move_string + ' ' + move_to_san(move, false);
        make_move(move);
      }

      /* are there any other leftover moves? */
      if (move_string.length) {
        moves.push(move_string);
      }

      /* is there a result? */
      if (typeof header.Result !== 'undefined') {
        moves.push(header.Result);
      }

      /* history should be back to what is was before we started generating PGN,
       * so join together moves
       */
      if (max_width === 0) {
        return result.join('') + moves.join(' ');
      }

      /* wrap the PGN output at max_width */
      var current_width = 0;
      for (var i = 0; i < moves.length; i++) {
        /* if the current move will push past max_width */
        if (current_width + moves[i].length > max_width && i !== 0) {

          /* don't end the line with whitespace */
          if (result[result.length - 1] === ' ') {
            result.pop();
          }

          result.push(newline);
          current_width = 0;
        } else if (i !== 0) {
          result.push(' ');
          current_width++;
        }
        result.push(moves[i]);
        current_width += moves[i].length;
      }

      return result.join('');
    },

    load_pgn: function(pgn, options) {
      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      function mask(str) {
        return str.replace(/\\/g, '\\');
      }

      function has_keys(object) {
        for (var key in object) {
          return true;
        }
        return false;
      }

      function parse_pgn_header(header, options) {
        var newline_char = (typeof options === 'object' &&
                            typeof options.newline_char === 'string') ?
                            options.newline_char : '\r?\n';
        var header_obj = {};
        var headers = header.split(new RegExp(mask(newline_char)));
        var key = '';
        var value = '';

        for (var i = 0; i < headers.length; i++) {
          key = headers[i].replace(/^\[([A-Z][A-Za-z]*)\s.*\]$/, '$1');
          value = headers[i].replace(/^\[[A-Za-z]+\s"(.*)"\]$/, '$1');
          if (trim(key).length > 0) {
            header_obj[key] = value;
          }
        }

        return header_obj;
      }

      var newline_char = (typeof options === 'object' &&
                          typeof options.newline_char === 'string') ?
                          options.newline_char : '\r?\n';
      var regex = new RegExp('^(\\[(.|' + mask(newline_char) + ')*\\])' +
                             '(' + mask(newline_char) + ')*' +
                             '1.(' + mask(newline_char) + '|.)*$', 'g');

      /* get header part of the PGN file */
      var header_string = pgn.replace(regex, '$1');

      /* no info part given, begins with moves */
      if (header_string[0] !== '[') {
        header_string = '';
      }

      reset();

      /* parse PGN header */
      var headers = parse_pgn_header(header_string, options);
      for (var key in headers) {
        set_header([key, headers[key]]);
      }

      /* load the starting position indicated by [Setup '1'] and
      * [FEN position] */
      if (headers['SetUp'] === '1') {
          if (!(('FEN' in headers) && load(headers['FEN']))) {
            return false;
          }
      }

      /* delete header to get the moves */
      var ms = pgn.replace(header_string, '').replace(new RegExp(mask(newline_char), 'g'), ' ');

      /* delete comments */
      ms = ms.replace(/(\{[^}]+\})+?/g, '');

      /* delete recursive annotation variations */
      var rav_regex = /(\([^\(\)]+\))+?/g
      while (rav_regex.test(ms)) {
        ms = ms.replace(rav_regex, '');
      }

      /* delete move numbers */
      ms = ms.replace(/\d+\.(\.\.)?/g, '');

      /* delete ... indicating black to move */
      ms = ms.replace(/\.\.\./g, '');

      /* delete numeric annotation glyphs */
      ms = ms.replace(/\$\d+/g, '');

      /* trim and get array of moves */
      var moves = trim(ms).split(new RegExp(/\s+/));

      /* delete empty entries */
      moves = moves.join(',').replace(/,,+/g, ',').split(',');
      var move = '';

      for (var half_move = 0; half_move < moves.length - 1; half_move++) {
        move = move_from_san(moves[half_move], sloppy);

        /* move not possible! (don't clear the board to examine to show the
         * latest valid position)
         */
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }

      /* examine last move */
      move = moves[moves.length - 1];
      if (POSSIBLE_RESULTS.indexOf(move) > -1) {
        if (has_keys(header) && typeof header.Result === 'undefined') {
          set_header(['Result', move]);
        }
      }
      else {
        move = move_from_san(move, sloppy);
        if (move == null) {
          return false;
        } else {
          make_move(move);
        }
      }
      return true;
    },

    header: function() {
      return set_header(arguments);
    },

    ascii: function() {
      return ascii();
    },

    turn: function() {
      return turn;
    },

    move: function(move, options) {
      /* The move function can be called with in the following parameters:
       *
       * .move('Nxb7')      <- where 'move' is a case-sensitive SAN string
       *
       * .move({ from: 'h7', <- where the 'move' is a move object (additional
       *         to :'h8',      fields are ignored)
       *         promotion: 'q',
       *      })
       */

      // allow the user to specify the sloppy move parser to work around over
      // disambiguation bugs in Fritz and Chessbase
      var sloppy = (typeof options !== 'undefined' && 'sloppy' in options) ?
                    options.sloppy : false;

      var move_obj = null;

      if (typeof move === 'string') {
        move_obj = move_from_san(move, sloppy);
      } else if (typeof move === 'object') {
        var moves = generate_moves();

        /* convert the pretty move object to an ugly move object */
        for (var i = 0, len = moves.length; i < len; i++) {
          if (move.from === algebraic(moves[i].from) &&
              move.to === algebraic(moves[i].to) &&
              (!('promotion' in moves[i]) ||
              move.promotion === moves[i].promotion)) {
            move_obj = moves[i];
            break;
          }
        }
      }

      /* failed to find move */
      if (!move_obj) {
        return null;
      }

      /* need to make a copy of move because we can't generate SAN after the
       * move is made
       */
      var pretty_move = make_pretty(move_obj);

      make_move(move_obj);

      return pretty_move;
    },

    undo: function() {
      var move = undo_move();
      return (move) ? make_pretty(move) : null;
    },

    clear: function() {
      return clear();
    },

    put: function(piece, square) {
      return put(piece, square);
    },

    get: function(square) {
      return get(square);
    },

    remove: function(square) {
      return remove(square);
    },

    perft: function(depth) {
      return perft(depth);
    },

    square_color: function(square) {
      if (square in SQUARES) {
        var sq_0x88 = SQUARES[square];
        return ((rank(sq_0x88) + file(sq_0x88)) % 2 === 0) ? 'light' : 'dark';
      }

      return null;
    },

    history: function(options) {
      var reversed_history = [];
      var move_history = [];
      var verbose = (typeof options !== 'undefined' && 'verbose' in options &&
                     options.verbose);

      while (history.length > 0) {
        reversed_history.push(undo_move());
      }

      while (reversed_history.length > 0) {
        var move = reversed_history.pop();
        if (verbose) {
          move_history.push(make_pretty(move));
        } else {
          move_history.push(move_to_san(move));
        }
        make_move(move);
      }

      return move_history;
    }

  };
};

/* export Chess object if using node or any other CommonJS compatible
 * environment */
if (typeof exports !== 'undefined') exports.Chess = Chess;
/* export Chess object for any RequireJS compatible environment */
if (typeof define !== 'undefined') define( function () { return Chess;  });

},{}],53:[function(require,module,exports){
(function (process){
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}

}).call(this,require('_process'))
},{"./debug":54,"_process":12}],54:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":56}],55:[function(require,module,exports){
(function (Buffer){
// int64-buffer.js

/*jshint -W018 */ // Confusing use of '!'.
/*jshint -W030 */ // Expected an assignment or function call and instead saw an expression.
/*jshint -W093 */ // Did you mean to return a conditional instead of an assignment?

var Uint64BE, Int64BE, Uint64LE, Int64LE;

!function(exports) {
  // constants

  var UNDEFINED = "undefined";
  var BUFFER = (UNDEFINED !== typeof Buffer) && Buffer;
  var UINT8ARRAY = (UNDEFINED !== typeof Uint8Array) && Uint8Array;
  var ARRAYBUFFER = (UNDEFINED !== typeof ArrayBuffer) && ArrayBuffer;
  var ZERO = [0, 0, 0, 0, 0, 0, 0, 0];
  var isArray = Array.isArray || _isArray;
  var BIT32 = 4294967296;
  var BIT24 = 16777216;

  // storage class

  var storage; // Array;

  // generate classes

  Uint64BE = factory("Uint64BE", true, true);
  Int64BE = factory("Int64BE", true, false);
  Uint64LE = factory("Uint64LE", false, true);
  Int64LE = factory("Int64LE", false, false);

  // class factory

  function factory(name, bigendian, unsigned) {
    var posH = bigendian ? 0 : 4;
    var posL = bigendian ? 4 : 0;
    var pos0 = bigendian ? 0 : 3;
    var pos1 = bigendian ? 1 : 2;
    var pos2 = bigendian ? 2 : 1;
    var pos3 = bigendian ? 3 : 0;
    var fromPositive = bigendian ? fromPositiveBE : fromPositiveLE;
    var fromNegative = bigendian ? fromNegativeBE : fromNegativeLE;
    var proto = Int64.prototype;
    var isName = "is" + name;
    var _isInt64 = "_" + isName;

    // properties
    proto.buffer = void 0;
    proto.offset = 0;
    proto[_isInt64] = true;

    // methods
    proto.toNumber = toNumber;
    proto.toString = toString;
    proto.toJSON = toNumber;
    proto.toArray = toArray;

    // add .toBuffer() method only when Buffer available
    if (BUFFER) proto.toBuffer = toBuffer;

    // add .toArrayBuffer() method only when Uint8Array available
    if (UINT8ARRAY) proto.toArrayBuffer = toArrayBuffer;

    // isUint64BE, isInt64BE
    Int64[isName] = isInt64;

    // CommonJS
    exports[name] = Int64;

    return Int64;

    // constructor
    function Int64(buffer, offset, value, raddix) {
      if (!(this instanceof Int64)) return new Int64(buffer, offset, value, raddix);
      return init(this, buffer, offset, value, raddix);
    }

    // isUint64BE, isInt64BE
    function isInt64(b) {
      return !!(b && b[_isInt64]);
    }

    // initializer
    function init(that, buffer, offset, value, raddix) {
      if (UINT8ARRAY && ARRAYBUFFER) {
        if (buffer instanceof ARRAYBUFFER) buffer = new UINT8ARRAY(buffer);
        if (value instanceof ARRAYBUFFER) value = new UINT8ARRAY(value);
      }

      // Int64BE() style
      if (!buffer && !offset && !value && !storage) {
        // shortcut to initialize with zero
        that.buffer = newArray(ZERO, 0);
        return;
      }

      // Int64BE(value, raddix) style
      if (!isValidBuffer(buffer, offset)) {
        var _storage = storage || Array;
        raddix = offset;
        value = buffer;
        offset = 0;
        buffer = new _storage(8);
      }

      that.buffer = buffer;
      that.offset = offset |= 0;

      // Int64BE(buffer, offset) style
      if (UNDEFINED === typeof value) return;

      // Int64BE(buffer, offset, value, raddix) style
      if ("string" === typeof value) {
        fromString(buffer, offset, value, raddix || 10);
      } else if (isValidBuffer(value, raddix)) {
        fromArray(buffer, offset, value, raddix);
      } else if ("number" === typeof raddix) {
        writeInt32(buffer, offset + posH, value); // high
        writeInt32(buffer, offset + posL, raddix); // low
      } else if (value > 0) {
        fromPositive(buffer, offset, value); // positive
      } else if (value < 0) {
        fromNegative(buffer, offset, value); // negative
      } else {
        fromArray(buffer, offset, ZERO, 0); // zero, NaN and others
      }
    }

    function fromString(buffer, offset, str, raddix) {
      var pos = 0;
      var len = str.length;
      var high = 0;
      var low = 0;
      if (str[0] === "-") pos++;
      var sign = pos;
      while (pos < len) {
        var chr = parseInt(str[pos++], raddix);
        if (!(chr >= 0)) break; // NaN
        low = low * raddix + chr;
        high = high * raddix + Math.floor(low / BIT32);
        low %= BIT32;
      }
      if (sign) {
        high = ~high;
        if (low) {
          low = BIT32 - low;
        } else {
          high++;
        }
      }
      writeInt32(buffer, offset + posH, high);
      writeInt32(buffer, offset + posL, low);
    }

    function toNumber() {
      var buffer = this.buffer;
      var offset = this.offset;
      var high = readInt32(buffer, offset + posH);
      var low = readInt32(buffer, offset + posL);
      if (!unsigned) high |= 0; // a trick to get signed
      return high ? (high * BIT32 + low) : low;
    }

    function toString(radix) {
      var buffer = this.buffer;
      var offset = this.offset;
      var high = readInt32(buffer, offset + posH);
      var low = readInt32(buffer, offset + posL);
      var str = "";
      var sign = !unsigned && (high & 0x80000000);
      if (sign) {
        high = ~high;
        low = BIT32 - low;
      }
      radix = radix || 10;
      while (1) {
        var mod = (high % radix) * BIT32 + low;
        high = Math.floor(high / radix);
        low = Math.floor(mod / radix);
        str = (mod % radix).toString(radix) + str;
        if (!high && !low) break;
      }
      if (sign) {
        str = "-" + str;
      }
      return str;
    }

    function writeInt32(buffer, offset, value) {
      buffer[offset + pos3] = value & 255;
      value = value >> 8;
      buffer[offset + pos2] = value & 255;
      value = value >> 8;
      buffer[offset + pos1] = value & 255;
      value = value >> 8;
      buffer[offset + pos0] = value & 255;
    }

    function readInt32(buffer, offset) {
      return (buffer[offset + pos0] * BIT24) +
        (buffer[offset + pos1] << 16) +
        (buffer[offset + pos2] << 8) +
        buffer[offset + pos3];
    }
  }

  function toArray(raw) {
    var buffer = this.buffer;
    var offset = this.offset;
    storage = null; // Array
    if (raw !== false && offset === 0 && buffer.length === 8 && isArray(buffer)) return buffer;
    return newArray(buffer, offset);
  }

  function toBuffer(raw) {
    var buffer = this.buffer;
    var offset = this.offset;
    storage = BUFFER;
    if (raw !== false && offset === 0 && buffer.length === 8 && Buffer.isBuffer(buffer)) return buffer;
    var dest = new BUFFER(8);
    fromArray(dest, 0, buffer, offset);
    return dest;
  }

  function toArrayBuffer(raw) {
    var buffer = this.buffer;
    var offset = this.offset;
    var arrbuf = buffer.buffer;
    storage = UINT8ARRAY;
    if (raw !== false && offset === 0 && (arrbuf instanceof ARRAYBUFFER) && arrbuf.byteLength === 8) return arrbuf;
    var dest = new UINT8ARRAY(8);
    fromArray(dest, 0, buffer, offset);
    return dest.buffer;
  }

  function isValidBuffer(buffer, offset) {
    var len = buffer && buffer.length;
    offset |= 0;
    return len && (offset + 8 <= len) && ("string" !== typeof buffer[offset]);
  }

  function fromArray(destbuf, destoff, srcbuf, srcoff) {
    destoff |= 0;
    srcoff |= 0;
    for (var i = 0; i < 8; i++) {
      destbuf[destoff++] = srcbuf[srcoff++] & 255;
    }
  }

  function newArray(buffer, offset) {
    return Array.prototype.slice.call(buffer, offset, offset + 8);
  }

  function fromPositiveBE(buffer, offset, value) {
    var pos = offset + 8;
    while (pos > offset) {
      buffer[--pos] = value & 255;
      value /= 256;
    }
  }

  function fromNegativeBE(buffer, offset, value) {
    var pos = offset + 8;
    value++;
    while (pos > offset) {
      buffer[--pos] = ((-value) & 255) ^ 255;
      value /= 256;
    }
  }

  function fromPositiveLE(buffer, offset, value) {
    var end = offset + 8;
    while (offset < end) {
      buffer[offset++] = value & 255;
      value /= 256;
    }
  }

  function fromNegativeLE(buffer, offset, value) {
    var end = offset + 8;
    value++;
    while (offset < end) {
      buffer[offset++] = ((-value) & 255) ^ 255;
      value /= 256;
    }
  }

  // https://github.com/retrofox/is-array
  function _isArray(val) {
    return !!val && "[object Array]" == Object.prototype.toString.call(val);
  }

}(typeof exports === 'object' && typeof exports.nodeName !== 'string' ? exports : (this || {}));

}).call(this,require("buffer").Buffer)
},{"buffer":4}],56:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}]},{},[30]);
