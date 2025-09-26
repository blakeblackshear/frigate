import { test, expect } from '@playwright/test';

const copy = obj => JSON.parse(JSON.stringify(obj));

const delay = async ms => new Promise(resolve => setTimeout(resolve, ms));

const expectUniquePoints = pts => {
  const toStringPt = pt => `(${pt.x},${pt.y})`;
  const toStringPts = pts => pts.map(toStringPt).join(' ');

  const str = toStringPts(pts);
  const strUnique = Array.from(new Set(pts.map(toStringPt))).join(' ');

  expect(str).toBe(strUnique);
};

const dist = (pt1, pt2) => Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);

test.describe('Renderer', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => console.log(`[browser] ${msg.text()}`));

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:3333/playwright-page/index.html');
  });

  test('starts with no nodes', async ({ page }) => {
    const numNodes = await page.evaluate(() => {
      const cy = window.cy;

      return cy.nodes().length;
    });

    expect(numNodes).toBe(0);
  });

  test('adds a node', async ({ page }) => {
    const numNodes = await page.evaluate(() => {
      const cy = window.cy;

      cy.add({
        data: { id: 'foo' }
      });

      return cy.nodes().length;
    });

    expect(numNodes).toBe(1);
  });

  test.describe('node style', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        const cy = window.cy;

        cy.add({ data: { id: 'a' } });

      });
    }); // beforeEach

    test('node bounding box extends beyond width and height for bordered triangle', async ({ page }) => {
      const bb = await page.evaluate(() => {
        const cy = window.cy;

        cy.style().fromJson([
          {
            selector: 'node',
            style: {
              'shape': 'triangle',
              'width': 100,
              'height': 100,
              'border-width': 10,
              'border-color': 'black',
            }
          }
        ]).update();

        return cy.$('#a').boundingBox();
      });

      expect(bb.w).toBeGreaterThan(105);
      expect(bb.h).toBeGreaterThan(105);
    } ); // node bounding box extends beyond width and height for triangle

  });

  test.describe('straight edges', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        const cy = window.cy;
  
        cy.style().fromJson([
          {
            selector: 'edge',
            style: {
              'curve-style': 'straight'
            }
          }
        ]).update();
  
        cy.add([
          {
            data: { id: 'a' },
            position: { x: 0, y: 0 }
          },
          {
            data: { id: 'b' },
            position: { x: 0, y: 0 }
          },
          {
            data: { id: 'ab1', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab2', source: 'a', target: 'b' }
          }
        ]);
      });
    }); // beforeEach

    test('initial bounding box is zero', async ({ page }) => {
      let bb1 = await page.evaluate(() => cy.$('#ab1').boundingBox());
      let bb2 = await page.evaluate(() => cy.$('#ab2').boundingBox());

      expect(bb1.w).toEqual(0);
      expect(bb1.h).toEqual(0);

      expect(bb2.w).toEqual(0);
      expect(bb2.h).toEqual(0);
    }); // initial bounding box is zero

    test('moved bounding box is nonzero', async ({ page }) => {
      await delay(500);

      await page.evaluate(() => {
        cy.layout({ name: 'grid', rows: 1, cols: 2 }).run();
      });

      await delay(500);

      let bb1 = await page.evaluate(() => cy.$('#ab1').boundingBox());
      let bb2 = await page.evaluate(() => cy.$('#ab2').boundingBox());

      expect(bb1.w).not.toEqual(0);
      expect(bb1.h).not.toEqual(0);

      expect(bb2.w).not.toEqual(0);
      expect(bb2.h).not.toEqual(0);
    }); // initial bounding box is nonzero

    test('manual endpoints correct', async ({ page }) => {
      // Set the endpoints manually
      const {
        ab1Source, ab1Target, ab2Source, ab2Target,
        ab1Midpoint, ab2Midpoint
      } = await page.evaluate(() => {
        const cy = window.cy;

        cy.$('#1').position({ x: 0, y: 0 });
        cy.$('#b').position({ x: 100, y: 0 });

        // Set the endpoints for the fist edge via style
        cy.$('#ab1').style('source-endpoint', '10px 10px');
        cy.$('#ab1').style('target-endpoint', '20px 10px');

        // Set the endpoints for the second edge via style
        cy.$('#ab2').style('source-endpoint', '30px 20px');
        cy.$('#ab2').style('target-endpoint', '40px 20px');

        // Return the endpoints for verification
        return {
          ab1Source: cy.$('#ab1').sourceEndpoint(),
          ab1Target: cy.$('#ab1').targetEndpoint(),
          ab2Source: cy.$('#ab2').sourceEndpoint(),
          ab2Target: cy.$('#ab2').targetEndpoint(),
          ab1Midpoint: cy.$('#ab1').midpoint(),
          ab2Midpoint: cy.$('#ab2').midpoint()
        };
      });

      // Verify the endpoints
      expect(ab1Source.x).toBe(10);
      expect(ab1Source.y).toBe(10);
      expect(ab1Target.x).toBe(20 + 100);
      expect(ab1Target.y).toBe(10);
      expect(ab2Source.x).toBe(30);
      expect(ab2Source.y).toBe(20);
      expect(ab2Target.x).toBe(40 + 100);
      expect(ab2Target.y).toBe(20);

      // Verify the midpoint y values only
      expect(ab1Midpoint.y).toEqual(10);
      expect(ab2Midpoint.y).toEqual(20);
    }); // manual endpoints correct
  });

  test.describe('bundled beziers', () => {
    const stepSize = 40;
    let ctrlpts1;
    let pt_ab1_1, pt_ab2_1;

    test.beforeEach(async ({ page }) => {
      ctrlpts1 = await page.evaluate(() => {
        const cy = window.cy;
  
        cy.style().fromJson([
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'control-point-step-size': 40
            }
          }
        ]).update();
  
        cy.add([
          {
            data: { id: 'a' }
          },
          {
            data: { id: 'b' }
          },
          {
            data: { id: 'ab1', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab2', source: 'a', target: 'b' }
          }
        ]);
  
        cy.layout({ name: 'grid', rows: 1, cols: 2 }).run();
  
        return cy.edges().map(edge => edge.controlPoints()[0]);
      });

      pt_ab1_1 = await page.evaluate(() => {
        return window.cy.$('#ab1').controlPoints()[0];
      });
  
      pt_ab2_1 = await page.evaluate(() => {
        return window.cy.$('#ab2').controlPoints()[0];
      });
    }); // beforeEach

    test('move when adding to the bundle', async ({ page }) => {
      expect(ctrlpts1.length).toBe(2);
      expectUniquePoints(ctrlpts1);
  
      // distance between the two control points
      let d_1_01 = dist(ctrlpts1[0], ctrlpts1[1]);
  
      expect(d_1_01).toBe(stepSize);
  
      let ctrlpts2 = await page.evaluate(() => {
        const cy = window.cy;
  
        cy.add([
          {
            data: { id: 'ab3', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab4', source: 'a', target: 'b' }
          }
        ]);
  
        return cy.edges().map(edge => edge.controlPoints()[0]);
      });
  
      // console.log(ctrlpts2);
  
      expect(ctrlpts2.length).toBe(4);
      expectUniquePoints(ctrlpts2);
  
      let d_2_01 = dist(ctrlpts2[0], ctrlpts2[1]);
      let d_2_12 = dist(ctrlpts2[1], ctrlpts2[2]);
      let d_2_23 = dist(ctrlpts2[2], ctrlpts2[3]);
  
      expect(d_2_01).toBeCloseTo(stepSize);
      expect(d_2_12).toBeCloseTo(stepSize);
      expect(d_2_23).toBeCloseTo(stepSize);
  
      let pt_ab1_2 = await page.evaluate(() => {
        return window.cy.$('#ab1').controlPoints()[0];
      });
  
      let pt_ab2_2 = await page.evaluate(() => {
        return window.cy.$('#ab2').controlPoints()[0];
      });
  
      // ctrl pts for ab1 and ab2 should have changed
      expect(pt_ab1_1).not.toEqual(pt_ab1_2);
      expect(pt_ab2_1).not.toEqual(pt_ab2_2);
    }); // move when adding to the bundle

    test('move when removing from the bundle', async ({ page }) => {
      await page.evaluate(() => {
        const cy = window.cy;
  
        cy.add([
          {
            data: { id: 'ab3', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab4', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab5', source: 'a', target: 'b' }
          }
        ]);
      });

      let pt_ab1_2 = await page.evaluate(() => cy.$('#ab1').controlPoints()[0]);
      let pt_ab2_2 = await page.evaluate(() => cy.$('#ab2').controlPoints()[0]);

      let ctrlpts3 = await page.evaluate(() => {
        const cy = window.cy;

        cy.$('#ab3').remove(); // only ab1,2,4,5 left

        return cy.edges().map(edge => edge.controlPoints()[0]);
      });

      let pt_ab1_3 = await page.evaluate(() => cy.$('#ab1').controlPoints()[0]);
      let pt_ab2_3 = await page.evaluate(() => cy.$('#ab2').controlPoints()[0]);

      expectUniquePoints(ctrlpts3);

      expect(pt_ab1_2).not.toEqual(pt_ab1_3);
      expect(pt_ab2_2).not.toEqual(pt_ab2_3);

      let d_3_01 = dist(ctrlpts3[0], ctrlpts3[1]);
      let d_3_12 = dist(ctrlpts3[1], ctrlpts3[2]);
      let d_3_23 = dist(ctrlpts3[2], ctrlpts3[3]);
  
      expect(d_3_01).toBeCloseTo(stepSize);
      expect(d_3_12).toBeCloseTo(stepSize);
      expect(d_3_23).toBeCloseTo(stepSize);
    }); // move when removing from the bundle

    test('do not move when setting one edge to visibility:hidden', async ({ page }) => {
      await page.evaluate(() => {
        window.cy.$('#ab1').style('visibility', 'hidden');
      });

      let pt_ab1_2 = await page.evaluate(() => cy.$('#ab1').controlPoints()[0]);
      let pt_ab2_2 = await page.evaluate(() => cy.$('#ab2').controlPoints()[0]);

      expect(pt_ab1_1).toEqual(pt_ab1_2);
      expect(pt_ab2_1).toEqual(pt_ab2_2);
    }); // do not move when setting one edge to visibility:hidden

    test('move when setting one edge to display:none', async ({ page }) => {
      await page.evaluate(() => {
        window.cy.$('#ab1').style('display', 'none');
      });

      let pt_ab1_2 = await page.evaluate(() => cy.$('#ab1').controlPoints());
      let pt_ab2_2 = await page.evaluate(() => cy.$('#ab2').controlPoints());

      expect(pt_ab1_2).toBeUndefined(); // because display: none
      expect(pt_ab2_2).toBeUndefined(); // because only one edge left => straight
    }); // move when setting one edge to display:none

    test('move when setting one edge to display:none (bigger bundle)', async ({ page }) => {
      await page.evaluate(() => {
        window.cy.add([
          {
            data: { id: 'ab3', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab4', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab5', source: 'a', target: 'b' }
          }
        ]);

        cy.$('#ab1').style('display', 'none');
      });

      let pt_ab1_2 = await page.evaluate(() => cy.$('#ab1').controlPoints());
      let pt_ab2_2 = await page.evaluate(() => cy.$('#ab2').controlPoints()[0]);

      expect(pt_ab1_2).toBeUndefined(); // because display: none
      expect(pt_ab2_2).toBeDefined();
      
    }); // move when setting one edge to display:none

    test('move when setting one edge to curve-style:straight', async ({ page }) => {
      await page.evaluate(() => {
        window.cy.add([
          {
            data: { id: 'ab3', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab4', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab5', source: 'a', target: 'b' }
          }
        ]);

        cy.$('#ab1').style('curve-style', 'straight');
      });

      let pt_ab1_2 = await page.evaluate(() => window.cy.$('#ab1').controlPoints());
      let pt_ab2_2 = await page.evaluate(() => window.cy.$('#ab2').controlPoints()[0]);

      expect(pt_ab1_2).toBeUndefined(); // because curve-style:straight
      expect(pt_ab2_2).toBeDefined();
      
    }); // move when setting one edge to curve-style:straight

    test('diagonal bottom left to top right', async ({page}) => {
      let controlPoints = await page.evaluate(() => {
        const cy = window.cy;
        cy.style().fromJson([{
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'control-point-step-size': Math.sqrt(200)
          }
        }]).update();
        cy.add([{
          data: {id: 'a'}
        }, {
          data: {id: 'b'}
        }, {
          data: {id: 'ab1', source: 'a', target: 'b'}
        }, {
          data: {id: 'ab2', source: 'a', target: 'b'}
        }]);
        var presetOptions = {
          name: 'preset',
          positions: {
            a: {x: 0, y: 100},
            b: {x: 100, y: 0}
          }
        };
        cy.layout(presetOptions).run();
        let pt_ab1_1 = cy.$('#ab1').controlPoints()[0];
        let pt_ab2_1 = cy.$('#ab2').controlPoints()[0];
        return [pt_ab1_1, pt_ab2_1]
      });
      // Step size 14.14, sqrt(10*10+10*10).
      // Gives a 5 pixel translation away from the mid-point,
      // if the vector between the nodes are at a 45 deg angle.
      // Mid-point is at (50,50)
      expect(controlPoints[0].x).toBeCloseTo(45, 5);
      expect(controlPoints[0].y).toBeCloseTo(45, 5);
      expect(controlPoints[1].x).toBeCloseTo(55, 5);
      expect(controlPoints[1].y).toBeCloseTo(55, 5);
    });

    // test('do not move when straight edge added', async ({ page }) => {
    //   await page.evaluate(() => {
    //     window.cy.add([
    //       {
    //         data: { id: 'ab3', source: 'a', target: 'b' },
    //         style: {
    //           'curve-style': 'straight'
    //         }
    //       }
    //     ]);
    //   });

    //   // TODO...
      
    // }); // move when setting one edge to curve-style:straight

  }); // bundled beziers

  test.describe('rounded-edges', () => {
    let singleBentEdge;
    let midCollinearEdge;

    test.beforeEach(async ({ page }) => {
      await page.evaluate(() => {
        const cy = window.cy;

        cy.style().fromJson([
          {
            selector: 'edge',
            style: {
              'curve-style': 'round-segments',
              'segment-radii': 50,
              'radius-type': 'influence-radius'
            }
          },
          {
            selector: '#ab1',
            style: {
              'segment-weights': [0.5],
              'segment-distances': [50]
            }
          },
          {
            selector: '#ab2',
            style: {
              'segment-weights': [0.25 , 0.5, 0.75],
              'segment-distances': [50, 50, 50]
            }
          }
        ]).update();

        cy.add([
          {
            data: { id: 'a' }
          },
          {
            data: { id: 'b' }
          },
          {
            data: { id: 'ab1', source: 'a', target: 'b' }
          },
          {
            data: { id: 'ab2', source: 'a', target: 'b' }
          },
        ]);

        cy.layout({ name: 'grid', rows: 1, cols: 2 }).run();

        singleBentEdge = cy.$('#ab1');
        midCollinearEdge = cy.$('#ab2');
      });

    }) // Before Each

    test('collinear mid point correctly defined', async ({page}) => {
      const midpoint = await page.evaluate(() => midCollinearEdge.midpoint());
      const points = await page.evaluate(() => midCollinearEdge.segmentPoints());

      expect(midpoint.x).not.toBeNaN();
      expect(midpoint.y).not.toBeNaN();
      expect(midpoint).toMatchObject(points[1])
    });

    test('mid point correctly defined', async ({page}) => {
      const {midpoint, points, a,b} = await page.evaluate(() => ({
        midpoint: singleBentEdge.midpoint(),
        points: singleBentEdge.segmentPoints(),
        a: singleBentEdge.source().position(),
        b: singleBentEdge.target().position(),
      }));



      expect(midpoint.x).not.toBeNaN();
      expect(midpoint.y).not.toBeNaN();
      const controlPoint = points[0];
      expect(midpoint).not.toMatchObject(controlPoint); // The mid point is supposed to be on the curve and not on the control point

      const isInsideTriangle = (point, {a,b,c}) => {
        const dX = point.x - a.x, dY = point.y - a.y;
        const dX21 = b.x - a.x, dY21 = b.y - a.y;
        const dX31 = c.x - a.x, dY31 = c.y - a.y;
        const denom = dY21 * dX31 - dX21 * dY31;
        const alpha = (dY21 * dX - dX21 * dY) / denom;
        const beta = (dX31 * dY - dY31 * dX) / denom;
        const gamma = 1 - alpha - beta;
        return alpha >= 0 && beta >= 0 && gamma >= 0;
      };
      // The actual midpoint should be within a triangle between the source, the target and the defined control point
      expect(isInsideTriangle(midpoint, {a,b,c: controlPoint})).toBeTruthy()

    })


  }); // Rounded edges

  test.describe('with layout', () => {

    test('single node cose layout with bounding box', async ({ page }) => {
      const pos = await page.evaluate(async () => {
        const cy = window.cy;

        // remove all eles
        cy.elements().remove();

        // add one node
        let node = cy.add({ data: { id: 'a' } }); 

        // run layout
        let layout = cy.layout({
          name: 'cose',
          boundingBox: {
            x1: 0,
            y1: 0,
            x2: 100,
            y2: 100
          },
        });

        let layoutstop = layout.promiseOn('layoutstop');

        layout.run();

        await layoutstop;

        return node.position();
      });
      
      expect(pos.x).not.toBeNaN();
      expect(pos.y).not.toBeNaN();

    }); // single node cose layout

  }); // with layout

}); // renderer