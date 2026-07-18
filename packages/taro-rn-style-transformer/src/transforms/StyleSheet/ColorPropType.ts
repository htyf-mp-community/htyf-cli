/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

'use strict'

import normalizeColor from './normalizeColor'
const colorPropType = function (
  // @ts-ignore
  isRequired,
  // @ts-ignore
  props,
  // @ts-ignore
  propName,
  // @ts-ignore
  componentName,
  // @ts-ignore
  location,
  // @ts-ignore
  propFullName
) {
  const color = props[propName]
  if (color === undefined || color === null) {
    if (isRequired) {
      return new Error(
        'Required ' +
          location +
          ' `' +
          (propFullName || propName) +
          '` was not specified in `' +
          componentName +
          '`.'
      )
    }
    return
  }

  if (typeof color === 'number') {
    // Developers should not use a number, but we are using the prop type
    // both for user provided colors and for transformed ones. This isn't ideal
    // and should be fixed but will do for now...
    return
  }

  if (normalizeColor(color) === null) {
    return new Error(
      'Invalid ' +
        location +
        ' `' +
        (propFullName || propName) +
        '` supplied to `' +
        componentName +
        '`: ' +
        color +
        '\n' +
        `Valid color formats are
  - '#f0f' (#rgb)
  - '#f0fc' (#rgba)
  - '#ff00ff' (#rrggbb)
  - '#ff00ff00' (#rrggbbaa)
  - 'rgb(255, 255, 255)'
  - 'rgba(255, 255, 255, 1.0)'
  - 'hsl(360, 100%, 100%)'
  - 'hsla(360, 100%, 100%, 1.0)'
  - 'transparent'
  - 'red'
  - 0xff00ff00 (0xrrggbbaa)
`
    )
  }
}

const ColorPropType = colorPropType.bind(null, false /* isRequired */)
// @ts-ignore
ColorPropType.isRequired = colorPropType.bind(null, true /* isRequired */)

export default ColorPropType
