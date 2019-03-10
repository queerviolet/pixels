
export type Unsubscribe = () => void
export type Emitter<T> = (value: T) => void
export type Initializer<T, X> = (emit: Emitter<T>, event: Event<T> & X) => X
export type Subscriber<T> = (input: T) => void
export type Event<T> = (subscriber: Subscriber<T>) => Unsubscribe

export default <T, X>(init: Initializer<T, X>): Event<T> & X => {
  const subscribers: Subscriber<T>[] = []
  const emit = (event: T) =>
    subscribers.forEach(s => s(event))

  const subscribe: any = (subscriber: Subscriber<T>): Unsubscribe => {
    subscribers.push(subscriber)
    return () => subscribers.splice(subscribers.indexOf(subscriber), 1)
  }
  
  const props = init(emit, subscribe)

  if (!props) return subscribe

  for (const p of Object.getOwnPropertyNames(props)) {
    const desc = Object.getOwnPropertyDescriptor(props, p)
    Object.defineProperty(subscribe, p, desc)
  }
  return subscribe
}