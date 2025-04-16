import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, Put, Delete } from '@nestjs/common';
import { MemoryService } from './memory.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('get/:id')
  async getMemoryById(@Param('id') id: string) {
    try {
      const memory = await this.memoryService.getMemoryById(id);
      
      if (!memory) {
        throw new HttpException('Memory not found', HttpStatus.NOT_FOUND);
      }
      
      return memory;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to retrieve memory: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
} 