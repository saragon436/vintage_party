import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter'
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], searchText: string): any[] {
    if (!items) return [];
    if (!searchText) return items;
    searchText = searchText.toLowerCase();
    return items.filter(item => {
      return item.codContract.toLowerCase().includes(searchText) ||
             item.customer.name.toLowerCase().includes(searchText) ||
             item.createDate.toLowerCase().includes(searchText) ||
             item.installDate.toLowerCase().includes(searchText) ||
             item.eventDate.toLowerCase().includes(searchText) ||
             item.pickupDate.toLowerCase().includes(searchText);
    });
  }
}