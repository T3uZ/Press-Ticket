import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import ShowUserService from "./ShowUserService";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  profile?: string;
  isTricked?: boolean;
  queueIds?: number[];
  whatsappIds?: number[];
  startWork?: string;
  endWork?: string;
}

interface Request {
  userData: UserData;
  userId: string | number;
}

interface Response {
  id: number;
  name: string;
  email: string;
  profile: string;
}

const UpdateUserService = async ({
  userData,
  userId
}: Request): Promise<Response | undefined> => {
  const user = await ShowUserService(userId);

  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    email: Yup.string().email(),
    profile: Yup.string(),
    password: Yup.string()
  });

  const {
    email,
    password,
    profile,
    isTricked,
    name,
    queueIds = [],
    whatsappIds = [],
    startWork,
    endWork
  } = userData;

  try {
    await schema.validate({ email, password, profile, name });
  } catch (err) {
    throw new AppError(err.message);
  }

  await user.update({
    email,
    password,
    profile,
    isTricked,
    name,
    startWork,
    endWork
  });

  await user.$set("queues", queueIds);
  await user.$set("whatsapps", whatsappIds);

  await user.reload();

  return SerializeUser(user);
};

export default UpdateUserService;