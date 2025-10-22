const cookieOptions = require('../cookieOptions.js')
const csruf = require('csurf')

const CSRFProtection = csruf({cookie:cookieOptions})

module.exports = CSRFProtection