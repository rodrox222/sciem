FROM php:8.2-apache

RUN echo 'memory_limit = 512M' >> /usr/local/etc/php/conf.d/docker-php-memlimit.ini;
RUN echo 'upload_max_filesize = 40M' >> /usr/local/etc/php/conf.d/docker-php-uploads.ini;

RUN apt-get update && apt-get -qq -y install curl --no-install-recommends \
    libpq-dev \
    git \
    unzip \
    libzip-dev \
    zlib1g-dev \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) zip pdo pdo_pgsql bcmath gd sockets

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/bin/ --filename=composer

# Configurar Apache para que apunte a /var/www/public
ENV APACHE_DOCUMENT_ROOT=/var/www/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN a2enmod rewrite
WORKDIR /var/www
COPY ./ /var/www
RUN chmod -R 0777 /var/www/storage/ /var/www/bootstrap/cache/

RUN composer config policy.advisories.block false && composer install --no-interaction