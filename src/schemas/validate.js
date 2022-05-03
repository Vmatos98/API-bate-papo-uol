import Joi from 'joi';

const userSchema = Joi.object({
    name: Joi.string().required(),
    // to: Joi.string().min(1).required(),
});


export default userSchema;
