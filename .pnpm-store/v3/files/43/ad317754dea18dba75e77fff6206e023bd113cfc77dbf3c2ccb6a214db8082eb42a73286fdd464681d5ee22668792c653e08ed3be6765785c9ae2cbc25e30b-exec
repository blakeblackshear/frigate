#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { imageSizeFromFile } = require('../dist/fromFile.cjs')

const files = process.argv.slice(2)

if (!files.length) {
  console.error('Usage: image-size image1 [image2] [image3] ...')
  process.exit(-1)
}

const red = ['\x1B[31m', '\x1B[39m']
const grey = ['\x1B[90m', '\x1B[39m']
const green = ['\x1B[32m', '\x1B[39m']

function colorize(text, color) {
  return color[0] + text + color[1]
}

files.forEach(async (image) => {
  try {
    if (fs.existsSync(path.resolve(image))) {
      const greyX = colorize('x', grey)
      const greyImage = colorize(image, grey)
      const result = await imageSizeFromFile(image)
      const sizes = result.images || [result]
      sizes.forEach((size) => {
        const type = size.type ?? result.type;
        const greyType = type ? colorize(` (${type})`, grey) : ''
        console.info(
          colorize(size.width, green) +
            greyX +
            colorize(size.height, green) +
            ' - ' +
            greyImage +
            greyType,
        )
      })
    } else {
      console.error("file doesn't exist - ", image)
    }
  } catch (e) {
    console.error(colorize(e.message, red), '-', image)
  }
})
