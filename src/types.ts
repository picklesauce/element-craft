export type Element = {
  id: string
  name: string
  emoji: string
  isNew?: boolean
}

export type Combination = {
  a: string
  b: string
  result: Element
}
