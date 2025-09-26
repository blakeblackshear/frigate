<!DOCTYPE html>
<html>
<head>
  <title>SVG.js benchmarker</title>
  <style>
    @import url('https://fonts.googleapis.com/css?family=Inconsolata');
    body {
      font-family: 'Inconsolata', 'Menlo', monospace;
      font-weight: 300;
      color: #999;
      font-size: 14px;
    }
    svg {
      width: 2px;
      height: 2px;
      overflow: hidden;
      position: fixed;
      right: 0;
    }
    span.name {
      color: #B7CD3E;
    }
    span.ms {
      color: #FF0066;
    }
    h1 {
      font-size: 1.2em;
    }
    .test {
      text-indent: 1em;
    }
    .skipped {
      color: #FBCB72;
    }
  </style>
</head>
<body>
  <div id="draw"></div>
  <svg id="native" width="100" height="100" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svgjs="http://svgjs.com/svgjs"></svg>
  <script src="../dist/svg.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/snap.svg/0.5.1/snap.svg-min.js"></script>
  <script src="svg.bench.js"></script>
  <!-- <script src="tests/10000-each.js"></script> 
  <script src="tests/10000-rects.js"></script>
  <script src="tests/10000-circles.js"></script>
  <script src="tests/10000-paths.js"></script>-->
  <script src="tests/10000-polysPointRead.js"></script>
  <script>
    SVG.bench.run()
  </script>
</body>
</html>