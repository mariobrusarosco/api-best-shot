console.log('best shot api!')

const express = require('express')

const PORT = 'localhost:3000'

const app = express()

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
