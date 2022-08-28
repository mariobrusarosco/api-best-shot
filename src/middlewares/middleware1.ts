const middleware1 = (_, __, next) => {
  console.log('Tá indo: #1')
  next()
  console.log('Tá voltando #1')
}

export default middleware1
