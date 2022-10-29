const middleware2 = (_: any, __: any, next: any) => {
  console.log('Tá indo: #2')
  next()
  console.log('Tá voltando #2')
}
export default middleware2
