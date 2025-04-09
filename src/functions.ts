import { BinaryLike, createHash } from "crypto"

export function sha256(content: BinaryLike): string {  
  return createHash('sha256').update(content).digest('hex')
}