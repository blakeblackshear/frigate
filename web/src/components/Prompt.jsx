import { h, Fragment } from 'preact';
import Button from './Button';
import Heading from './Heading';
import Dialog from './Dialog';

export default function Prompt({ actions = [], title, text }) {
return (
  <Dialog>
    <div className="p-4">
      <Heading size="lg">{title}</Heading>
      <p>{text}</p>
    </div>
    <div className="p-2 flex justify-start flex-row-reverse space-x-2">
      {actions.map(({ color, text, onClick, ...props }, i) => (
        <Button className="ml-2" color={color} key={i} onClick={onClick} type="text" {...props}>
          {text}
        </Button>
      ))}
    </div>
  </Dialog>
)
}
