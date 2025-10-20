const cookieOptions = {
    httpOnly: true,
    secure:false,
    maxAge: 3600 * 1000,
    sameSite:'lax'
}

module.exports = cookieOptions