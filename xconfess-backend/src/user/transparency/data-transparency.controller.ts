import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DataTransparencyService } from './data-transparency.service';
import { TransparencyPanelReport } from './data-transparency.types';

@Controller('users/transparency')
export class DataTransparencyController {
  constructor(private readonly transparencyService: DataTransparencyService) {}

  @Get('data-use-panel')
  @UseGuards(JwtAuthGuard)
  async getDataUsePanel(@Req() req: any): Promise<TransparencyPanelReport> {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Authentication credentials missing');
    }
    return this.transparencyService.getTransparencyPanel(userId);
  }
}
