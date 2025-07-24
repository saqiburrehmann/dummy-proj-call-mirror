import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CallService } from './call.service';
import { CreateCallDto } from './dto/create-call.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  @Get()
  getCalls(@Request() req) {
    return this.callService.getUserCall(req.user.id);
  }

  @Post()
  createCall(@Body() dto: CreateCallDto) {
    return this.callService.createCall(dto);
  }
}
