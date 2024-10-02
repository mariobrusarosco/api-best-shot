import { Request, Response } from 'express'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { MEMBER_TABLE } from '../../../services/database/schema'
import db from '../../../services/database'
import { eq } from 'drizzle-orm'
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper'
import { Utils } from '@/domains/auth/utils'

async function authenticateUser(req: Request, res: Response) {
  try {
    const body = req?.body as { memberId: string }
    const publicId = body.memberId

    const member = await db
      .select()
      .from(MEMBER_TABLE)
      .where(eq(MEMBER_TABLE.id, publicId))

    if (!member) throw new Error('no user found to authenticate')

    const token = Utils.signUserCookieBased(publicId, res)
    return res.status(200).send(token)
  } catch (error: any) {
    console.error(`[AUTH - POST] ${error}`)

    return res
      .status(GlobalErrorMapper.BIG_FIVE_HUNDRED.status)
      .send(GlobalErrorMapper.BIG_FIVE_HUNDRED.user)
  }
}

const getMember = async (req: Request, res: Response) => {
  const memberId = req?.body?.memberId

  try {
    const member = await db
      .select()
      .from(MEMBER_TABLE)
      .where(eq(MEMBER_TABLE.id, memberId))

    return res.status(200).send(member[0])
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error)
  }
}

const AuthController = {
  getMember,
  authenticateUser
}

export default AuthController
