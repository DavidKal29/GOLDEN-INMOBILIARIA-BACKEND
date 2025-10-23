const cookieOptions = {
    httpOnly: true,
    secure:true,
    maxAge: 3600 * 1000,
    sameSite:'none'
}

module.exports = cookieOptions