export default class AJVStub {
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  compile(): () => boolean {
    return () => true
  }
}
