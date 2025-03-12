# BarkBrowse

**BarkBrowse** is a single-page Angular application that lets users search for shelter dogs. It provides a user-friendly interface to filter, sort, and browse dog profiles, manage favorites, and view detailed profiles—all in one place.

## Overview

BarkBrowse is designed to help users quickly find the perfect shelter dog by filtering search results by breed, age, and other criteria. The application offers:
- A modern, responsive interface powered by Angular and Bootstrap.
- Modal-based views for detailed dog previews.
- Real-time filtering and pagination.
- An option to save favorite dogs for later review.
- Map search functionality to help locate nearby shelters.

## Features

- **Search & Filter:**  
  Easily filter dogs by breed and minimum and maximum age.

- **Sorting:**  
  Sort results by fields such as breed, name, or age in ascending or descending order (e.g., `sort=breed:asc`).

- **Pagination:**  
  Navigate through large sets of results with built-in pagination.

- **Favorites:**  
  Save and manage your favorite shelter dogs.

- **Map Search:**  
  You can use an integrated map view (powered by Leaflet) to locate nearby shelters, making finding dogs available in your area easier.

- **Responsive Design:**  
  A mobile-first, responsive design ensures a great experience on any device.

## Technologies Used

- **Angular** – Front-end framework.
- **Bootstrap** – Styling and responsive design.
- **Leaflet** – Map integration for the map search feature.
- **TypeScript** – Application logic.
- **GitHub Pages** – (For deployment)

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [Angular CLI](https://angular.io/cli) (v12 or later recommended)
- Git

### Steps

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Whatever90/fetch-dogs-angular.git
   cd fetch-dogs-angular
   ```

2. **Install Dependencies:**
   
   ```bash
   npm install
   ```

## Running Locally
To run the application on your local machine:

  ```bash
   ng serve
  ```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.


Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

**Thanks to the Angular, Bootstrap, and Leaflet communities for providing the tools and libraries that made this project possible.**
