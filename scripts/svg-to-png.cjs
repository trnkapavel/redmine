const { Resvg } = require('@resvg/resvg-js')
const fs = require('fs')
const path = require('path')

const [,, src, dest, size = '1024'] = process.argv
if (!src || !dest) {
  console.error('Usage: node svg-to-png.cjs <src.svg> <dest.png> [size]')
  process.exit(1)
}
const svg = fs.readFileSync(path.resolve(src), 'utf8')
const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: parseInt(size, 10) } })
const png = resvg.render().asPng()
fs.writeFileSync(path.resolve(dest), png)
console.log(`${src} → ${dest} (${size}px)`)
