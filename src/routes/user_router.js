import { Router } from 'express';
import { userRegister, loginUser, logoutUser, refreshAccessToken} from '../controllers/user_controller.js';

import { upload } from '../middlewares/multar_middleware.js';
import  verifyJWT  from '../middlewares/auth_middleware.js';
const router = Router();

router.route("/register").post(
    upload.fields([
        { name: 'avatar', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]),
    userRegister
);

router.route("/login").post(loginUser);
// secured route
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

export default router;