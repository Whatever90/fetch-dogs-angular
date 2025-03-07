import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'pagination',
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent {
  // Total number of dogs available
  @Input() dogsTotalCount!: number;
  // Current page (default to 1)
  // Number of dogs per page
  @Input() pageSize: number = 25;
  @Input() pagesTotalCount: number = 0;
  @Input() page: number = 0;
  constructor(private router: Router, private route: ActivatedRoute) {}
  ngOnInit(): void {
    const queryParams = this.route.snapshot.queryParams;
    if(queryParams['page']) {
      this.page = Number(queryParams['page'])
    }
  }
  goToPage(page: number | string) {
      this.page = (page as number);
      this.router.navigate([], {
        queryParams: { page: page },
        queryParamsHandling: 'merge'
      });
  }
}
