import { h, Component } from 'preact';
import Flickity from 'flickity';
import 'flickity/css/flickity.css';

export default class Carousel extends Component {
  constructor(props) {
    super(props);

    this.carousel = null;
    this.flkty = null;
  }

  create() {
    if (this.carousel) {
      this.flkty = new Flickity(this.carousel, this.props.options);

      if (this.props.flickityRef) {
        this.props.flickityRef(this.flkty);
      }
    }
  }

  destroy() {
    if (this.flkty) {
      this.flkty.destroy();
      this.flkty = null;
      this.carousel = null;
    }
  }

  componentWillUpdate() {
    this.destroy();
  }

  componentDidUpdate() {
    this.create();
  }

  componentWillUnmount() {
    this.destroy();
  }

  componentDidMount() {
    this.create();
  }

  render(props) {
    return h(
      this.props.elementType,
      {
        className: this.props.className,
        ref: (c) => {
          this.carousel = c;
        },
      },
      this.props.children
    );
  }
}

Carousel.defaultProps = {
  options: {},
  className: '',
  elementType: 'div',
};
