import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { ContactResponseDto } from './dto/response-contact.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Contact')
@ApiBearerAuth()
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @UseGuards(JwtAuthGuard)
  @Post('/create')
  @ApiOperation({
    summary: 'Create a new contact',
    description: `Creates a new contact for the authenticated user.  
👉 Requires JWT token in the 'Authorization' header (Bearer token).  
👉 The body must contain 'contactUserId' (UUID of the user to be added).  
❌ You cannot add yourself or a duplicate contact.`,
  })
  @ApiBody({
    type: CreateContactDto,
    description: 'Payload to create a new contact',
    examples: {
      example1: {
        summary: 'Sample request body',
        value: {
          contactUserId: '3f5aefc2-33f7-4a60-aedd-6d897582eb76',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    schema: {
      example: {
        message: 'Contact created successfully',
        data: {
          id: 'contact-id',
          ownerId: 'owner-id',
          contactUser: {
            id: 'contact-user-id',
            email: 'john@example.com',
            fullName: 'John Doe',
            phone: '+1234567890',
          },
        },
      },
    },
  })
  @ApiConflictResponse({ description: 'Contact already exists or you are trying to add yourself' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async create(
    @Body() createContactDto: CreateContactDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.userId;
    return this.contactService.create(createContactDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get all contacts',
    description: `Fetches all contacts for the authenticated user.  
👉 Requires JWT token in the 'Authorization' header (Bearer token).`,
  })
  @ApiResponse({
    status: 200,
    description: 'List of contacts',
    schema: {
      example: {
        message: 'Contacts fetched successfully',
        data: [
          {
            id: 'contact-id',
            ownerId: 'owner-id',
            contactUser: {
              id: 'contact-user-id',
              email: 'john@example.com',
              fullName: 'John Doe',
              phone: '+1234567890',
            },
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return this.contactService.findAll(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get a contact by ID',
    description: `Fetch a single contact by contact ID.  
👉 Requires JWT token in the 'Authorization' header (Bearer token).`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the contact to fetch',
    example: '0e2bfc5f-42c9-4039-9b17-3220dd2b8167',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact fetched successfully',
    schema: {
      example: {
        message: 'Contact fetched successfully',
        data: {
          id: 'contact-id',
          ownerId: 'owner-id',
          contactUser: {
            id: 'contact-user-id',
            email: 'john@example.com',
            fullName: 'John Doe',
            phone: '+1234567890',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async findOne(@Param('id') id: string) {
    return this.contactService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a contact',
    description: `Updates a contact's properties like nickname.  
👉 Requires JWT token in the 'Authorization' header.`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the contact to update',
    example: 'a12345-b67890',
  })
  @ApiBody({
    type: UpdateContactDto,
    examples: {
      example1: {
        summary: 'Update nickname',
        value: {
          nickname: 'Work Friend',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    schema: {
      example: {
        message: 'Contact updated successfully',
        data: {
          id: 'contact-id',
          ownerId: 'owner-id',
          contactUser: {
            id: 'contact-user-id',
            email: 'john@example.com',
            fullName: 'John Doe',
            phone: '+1234567890',
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async updateOne(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactService.updateOne(id, updateContactDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a contact',
    description: `Soft deletes (marks as deleted) the contact by ID.  
👉 Requires JWT token in the 'Authorization' header.`,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the contact to delete',
    example: 'a12345-b67890',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
    schema: {
      example: {
        message: 'Contact deleted successfully',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  async remove(@Param('id') id: string) {
    return this.contactService.remove(id);
  }
}
