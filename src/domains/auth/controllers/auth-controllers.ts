import { Request, Response } from 'express'
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper'
import { MEMBER_TABLE, SelectMember } from '../../../services/database/schema'
import db from '../../../services/database'
import { eq } from 'drizzle-orm'

const getMember = async (req: Request, res: Response) => {
  const memberId = req?.body?.memberId
  console.log('memberId', memberId)

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
  getMember
}

export default AuthController
