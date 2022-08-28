const middleware2 = (_, __, next) => {
  console.log('Tá indo: #2')
  next()
  console.log('Tá voltando #2')
}
export default middleware2
