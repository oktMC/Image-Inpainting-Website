const passport = require('passport');
const User = require("../models/user");
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const customFields = {
      usernameField: 'username',
      passwordField: 'password',
}

const localstrategy = new LocalStrategy(
    customFields, 
    async (username, password, done) => {
        try {
            const user = await User.getUserbyUsername(username)
            if (!user|| !(await user.isPasswordMatch(password))){
                return done(null, false, { message: 'Incorrect username or password.'});
            }
            return done(null, user);
        } catch(err){
            return done(err, null);
        }
    }
);

passport.serializeUser((user,done)=>{
    console.log('Serializing user:', user.id)
    done(null,user.id)
})

passport.deserializeUser(async(id,done)=>{
    console.log('Deserializing user ID:', id)
    try {
        const user = await User.getUserbyID(id)
        if (!user) return done(null, false) 
        done(null, user) 
    } catch (err) {
        done(err) 
    }
})

//JWT

const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt']; // Replace 'jwt' with your cookie name
  }
  return token;
};

const jwtOptions = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_SECRET,
};

const jwtStrategy = new JwtStrategy(
  jwtOptions,
  async (jwtPayload, done) => {
    try {
        const user = await User.getUserById(jwtPayload.sub);
        if (!user) return done(null, false);
        return done(null, user);
    } catch (err) {
        return done(err);
    }
  }
);

passport.use(localstrategy);
passport.use(jwtStrategy);

module.exports = passport