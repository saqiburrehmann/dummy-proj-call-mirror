import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { Contact } from './entities/contact.entity';
import { User } from '../user/entities/user.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactResponseDto } from './dto/response-contact.dto';
import { UserResponseDto } from 'src/user/dto/response.-user.dto';
import { FlatContactResponseDto } from './dto/flat-contact-response.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(
    dto: CreateContactDto,
    ownerId: string,
  ): Promise<{ message: string; data: ContactResponseDto }> {
    const owner = await this.userRepo.findOne({ where: { id: ownerId } });

    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    const contactUser = await this.userRepo.findOne({
      where: {
        email: dto.email,
        phone: dto.phone,
      },
      select: ['id', 'email', 'fullName', 'phone'],
    });

    if (!contactUser) {
      throw new NotFoundException('Contact user not found');
    }

    if (owner.id === contactUser.id) {
      throw new ConflictException('Cannot add yourself as a contact');
    }

    const existing = await this.contactRepo.findOne({
      where: {
        owner: { id: owner.id },
        contactUser: { id: contactUser.id },
      },
    });

    if (existing) {
      throw new ConflictException('Contact already exists');
    }

    const newContact = this.contactRepo.create({ owner, contactUser });
    const saved = await this.contactRepo.save(newContact);

    const response = plainToInstance(
      ContactResponseDto,
      {
        ...saved,
        contactUser: plainToInstance(UserResponseDto, contactUser, {
          excludeExtraneousValues: true,
        }),
      },
      { excludeExtraneousValues: true },
    );

    return {
      message: 'Contact created successfully',
      data: response,
    };
  }

  async findAll(ownerId: string): Promise<{
    message: string;
    data: FlatContactResponseDto[];
  }> {
    const owner = await this.userRepo.findOne({ where: { id: ownerId } });
    if (!owner) {
      throw new NotFoundException('Owner user not found');
    }

    const contacts = await this.contactRepo.find({
      where: { owner: { id: ownerId } },
      relations: ['contactUser'],
    });

    const response = contacts.map((c) =>
      plainToInstance(
        FlatContactResponseDto,
        {
          id: c.id,
          email: c.contactUser.email,
          fullName: c.contactUser.fullName,
          phone: c.contactUser.phone,
        },
        { excludeExtraneousValues: true },
      ),
    );

    return {
      message: 'Contacts fetched successfully',
      data: response,
    };
  }

  async findOne(id: string): Promise<{
    message: string;
    data: ContactResponseDto;
  }> {
    const contact = await this.contactRepo.findOne({
      where: { id },
      relations: ['contactUser'],
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const response = plainToInstance(
      ContactResponseDto,
      {
        ...contact,
        contactUser: plainToInstance(UserResponseDto, contact.contactUser, {
          excludeExtraneousValues: true,
        }),
      },
      { excludeExtraneousValues: true },
    );

    return {
      message: 'Contact fetched successfully',
      data: response,
    };
  }

  async updateOne(
    id: string,
    dto: UpdateContactDto,
  ): Promise<{
    message: string;
    data: ContactResponseDto;
  }> {
    const contact = await this.contactRepo.findOne({
      where: { id },
      relations: ['contactUser'],
    });

    if (!contact) {
      throw new NotFoundException(`Contact not found with id ${id}`);
    }

    const updatedContact = await this.contactRepo.preload({
      id,
      ...dto,
    });

    if (!updatedContact) {
      throw new NotFoundException(`Failed to preload contact with id ${id}`);
    }

    const saved = await this.contactRepo.save(updatedContact);

    const response = plainToInstance(
      ContactResponseDto,
      {
        ...saved,
        contactUser: plainToInstance(UserResponseDto, contact.contactUser, {
          excludeExtraneousValues: true,
        }),
      },
      { excludeExtraneousValues: true },
    );

    return {
      message: 'Contact updated successfully',
      data: response,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const result = await this.contactRepo.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Contact not found with id ${id}`);
    }

    return {
      message: 'Contact deleted successfully',
    };
  }
}
