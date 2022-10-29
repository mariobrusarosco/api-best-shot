const middleware1 = (_: any, __: any, next: any) => {
  console.log('Tá indo: #1')
  next()
  console.log('Tá voltando #1')
}

export default middleware1
