import Utils from '../../utils/Utils'
import Helpers from './Helpers'

export default class PointAnnotations {
  constructor(annoCtx) {
    this.w = annoCtx.w
    this.annoCtx = annoCtx
    this.helpers = new Helpers(this.annoCtx)
  }

  addPointAnnotation(anno, parent, index) {
    const w = this.w

    if (w.globals.collapsedSeriesIndices.indexOf(anno.seriesIndex) > -1) {
      return
    }

    let result = this.helpers.getX1X2('x1', anno)
    let x = result.x
    let clipX = result.clipped
    result = this.helpers.getY1Y2('y1', anno)
    let y = result.yP
    let clipY = result.clipped

    if (!Utils.isNumber(x)) return

    if (!(clipY || clipX)) {
      let optsPoints = {
        pSize: anno.marker.size,
        pointStrokeWidth: anno.marker.strokeWidth,
        pointFillColor: anno.marker.fillColor,
        pointStrokeColor: anno.marker.strokeColor,
        shape: anno.marker.shape,
        pRadius: anno.marker.radius,
        class: `apexcharts-point-annotation-marker ${anno.marker.cssClass} ${
          anno.id ? anno.id : ''
        }`,
      }

      let point = this.annoCtx.graphics.drawMarker(
        x + anno.marker.offsetX,
        y + anno.marker.offsetY,
        optsPoints
      )

      parent.appendChild(point.node)

      const text = anno.label.text ? anno.label.text : ''

      let elText = this.annoCtx.graphics.drawText({
        x: x + anno.label.offsetX,
        y:
          y +
          anno.label.offsetY -
          anno.marker.size -
          parseFloat(anno.label.style.fontSize) / 1.6,
        text,
        textAnchor: anno.label.textAnchor,
        fontSize: anno.label.style.fontSize,
        fontFamily: anno.label.style.fontFamily,
        fontWeight: anno.label.style.fontWeight,
        foreColor: anno.label.style.color,
        cssClass: `apexcharts-point-annotation-label ${
          anno.label.style.cssClass
        } ${anno.id ? anno.id : ''}`,
      })

      elText.attr({
        rel: index,
      })

      parent.appendChild(elText.node)

      // TODO: deprecate this as we will use custom
      if (anno.customSVG.SVG) {
        let g = this.annoCtx.graphics.group({
          class:
            'apexcharts-point-annotations-custom-svg ' + anno.customSVG.cssClass,
        })

        g.attr({
          transform: `translate(${x + anno.customSVG.offsetX}, ${
            y + anno.customSVG.offsetY
          })`,
        })

        g.node.innerHTML = anno.customSVG.SVG
        parent.appendChild(g.node)
      }

      if (anno.image.path) {
        let imgWidth = anno.image.width ? anno.image.width : 20
        let imgHeight = anno.image.height ? anno.image.height : 20

        point = this.annoCtx.addImage({
          x: x + anno.image.offsetX - imgWidth / 2,
          y: y + anno.image.offsetY - imgHeight / 2,
          width: imgWidth,
          height: imgHeight,
          path: anno.image.path,
          appendTo: '.apexcharts-point-annotations',
        })
      }

      if (anno.mouseEnter) {
        point.node.addEventListener(
          'mouseenter',
          anno.mouseEnter.bind(this, anno)
        )
      }
      if (anno.mouseLeave) {
        point.node.addEventListener(
          'mouseleave',
          anno.mouseLeave.bind(this, anno)
        )
      }
      if (anno.click) {
        point.node.addEventListener('click', anno.click.bind(this, anno))
      }
    }
  }

  drawPointAnnotations() {
    let w = this.w

    let elg = this.annoCtx.graphics.group({
      class: 'apexcharts-point-annotations',
    })

    w.config.annotations.points.map((anno, index) => {
      this.addPointAnnotation(anno, elg.node, index)
    })

    return elg
  }
}
