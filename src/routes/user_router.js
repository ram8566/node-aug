import { Router } from 'express';
import { userRegister } from '../controllers/user_controller.js';
const router = Router();

router.route("/register").post(userRegister);

export default router;