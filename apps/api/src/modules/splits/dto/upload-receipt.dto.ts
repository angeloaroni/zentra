import { IsString, IsNotEmpty } from 'class-validator'

export class UploadReceiptDto {
  @IsString()
  @IsNotEmpty()
  receiptData: string

  @IsString()
  @IsNotEmpty()
  receiptMime: string
}
