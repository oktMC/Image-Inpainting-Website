const mongoose = require('mongoose');
const bcrypt = require("bcryptjs")

const APIError = require("../utils/apiError.js")


const userSchema = mongoose.Schema(
    {
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
    },
    {   
        timestamps: true,
    }
);

class UserClass{
    static async isUsernameExist(username,excludedUserId){
        return !!(await this.findOne({username:username, _id:{$ne:excludedUserId}}))
    }

    static async getUserById(_id){
        return await this.findById(_id);
    }

    static async getUserbyUsername(username){
        return  await this.findOne({ username: username })
    }

    static async createUser(body){
        if(await this.isUsernameExist(body.username)){
            throw new APIError("Username Already Exist", 400)
        }
        return await this.create(body)
    }

    static async updateUserById(userId, body) {
		const user = await this.getUserById(userId);
		if (!user) {
			throw new APIError('User not found', 404);
		}
		if (await this.isUsernameExist(body.username, userId)) {
			throw new APIError('Username already exists', 400);
		}
		Object.assign(user, body);
		return await user.save();
	}

    static async deleteUserById(userId) {
		const user = await this.getUserById(userId);
		if (!user) {
			throw new APIError('User not found', 404);
		}
		return await user.remove();
	}

    async isPasswordMatch(password) {
		return bcrypt.compareSync(password, this.password);
	}
}

userSchema.loadClass(UserClass);

userSchema.pre('save', async function (next) {
	if (this.isModified('password')) {
		const passwordGenSalt = await bcrypt.genSalt(10);
		this.password = await bcrypt.hash(this.password, passwordGenSalt);
	}
	next();
});

const User = mongoose.model('users', userSchema);

module.exports = User