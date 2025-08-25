import { IsString, IsOptional } from "class-validator"

class CreateCookieDto {
    @IsString()
    country: string;

    @IsString()
    region: string;

    @IsString()
    localTime: string;

    @IsString()
    userAgent: string;

    @IsString()
    language: string;

    @IsOptional()
    @IsString()
    referer?: string;
}

export default CreateCookieDto;
