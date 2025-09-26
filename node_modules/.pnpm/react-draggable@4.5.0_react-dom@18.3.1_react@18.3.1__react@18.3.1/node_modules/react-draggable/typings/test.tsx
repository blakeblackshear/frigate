import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Draggable, {DraggableCore} from 'react-draggable';

const root = document.getElementById('root')

function handleStart() {}
function handleDrag() {}
function handleStop() {}
function handleMouseDown() {}

const nodeRef = React.createRef<HTMLDivElement>();
ReactDOM.render(
  <Draggable
    axis="y"
    handle=".handle"
    cancel=".cancel"
    grid={[10, 10]}
    onStart={handleStart}
    onDrag={handleDrag}
    onStop={handleStop}
    offsetParent={document.body}
    onMouseDown={handleMouseDown}
    allowAnyClick={true}
    allowMobileScroll={false}
    disabled={true}
    enableUserSelectHack={false}
    bounds={false}
    defaultClassName={'draggable'}
    defaultClassNameDragging={'dragging'}
    defaultClassNameDragged={'dragged'}
    defaultPosition={{x: 0, y: 0}}
    nodeRef={nodeRef}
    positionOffset={{x: 0, y: 0}}
    position={{x: 50, y: 50}}>
    <div className="foo bar" ref={nodeRef}>
      <div className="handle"/>
      <div className="cancel"/>
    </div>
  </Draggable>,
  root
);

const nodeRefCore = React.createRef<HTMLDivElement>();
ReactDOM.render(
  <DraggableCore
    handle=".handle"
    cancel=".cancel"
    allowAnyClick={true}
    disabled={true}
    onMouseDown={handleMouseDown}
    grid={[10, 10]}
    nodeRef={nodeRefCore}
    onStart={handleStart}
    onDrag={handleDrag}
    onStop={handleStop}
    offsetParent={document.body}
    enableUserSelectHack={false}
    allowMobileScroll={false}>
    <div className="foo bar" ref={nodeRefCore}>
      <div className="handle"/>
      <div className="cancel"/>
    </div>
  </DraggableCore>,
  root
);


ReactDOM.render(<Draggable><div/></Draggable>, root);

ReactDOM.render(<DraggableCore><div/></DraggableCore>, root);
