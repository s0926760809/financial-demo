package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	Security SecurityConfig `mapstructure:"security"`
}

type ServerConfig struct {
	Port    string `mapstructure:"port"`
	Host    string `mapstructure:"host"`
	Mode    string `mapstructure:"mode"`
	Timeout int    `mapstructure:"timeout"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     string `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

type SecurityConfig struct {
	JWTSecret    string `mapstructure:"jwt_secret"`
	APIKey       string `mapstructure:"api_key"`
	AdminToken   string `mapstructure:"admin_token"`
	DatabaseURL  string `mapstructure:"database_url"`
	PrivateKey   string `mapstructure:"private_key"`
}

var AppConfig *Config

func LoadConfig() error {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("./config")
	viper.AddConfigPath(".")

	// 設置默認值
	viper.SetDefault("server.port", "8080")
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.mode", "release")
	viper.SetDefault("server.timeout", 30)

	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", "5432")
	viper.SetDefault("database.user", "trading_user")
	viper.SetDefault("database.password", "password123")
	viper.SetDefault("database.dbname", "trading_db")
	viper.SetDefault("database.sslmode", "disable")

	viper.SetDefault("redis.host", "localhost")
	viper.SetDefault("redis.port", "6379")
	viper.SetDefault("redis.password", "")
	viper.SetDefault("redis.db", 0)

	// 故意設置弱密碼用於安全演示
	viper.SetDefault("security.jwt_secret", "weak_secret_123")
	viper.SetDefault("security.api_key", "super_secret_api_key")
	viper.SetDefault("security.admin_token", "admin123")
	viper.SetDefault("security.database_url", "postgres://admin:admin@localhost/trading")
	viper.SetDefault("security.private_key", "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7...")

	// 支持環境變量並設置映射
	viper.AutomaticEnv()
	viper.BindEnv("server.port", "SERVER_PORT")
	viper.BindEnv("server.host", "SERVER_HOST")
	viper.BindEnv("database.host", "DATABASE_HOST")
	viper.BindEnv("database.user", "DATABASE_USER")
	viper.BindEnv("database.password", "DATABASE_PASSWORD")
	viper.BindEnv("database.dbname", "DATABASE_NAME")
	viper.BindEnv("redis.host", "REDIS_HOST")
	viper.BindEnv("redis.password", "REDIS_PASSWORD")

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// 配置文件未找到，使用默認值
			fmt.Println("配置文件未找到，使用默認配置")
		} else {
			return fmt.Errorf("讀取配置文件錯誤: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return fmt.Errorf("解析配置錯誤: %w", err)
	}

	AppConfig = &config
	return nil
}

// 故意暴露敏感配置的函數 - 用於安全演示
func GetSensitiveConfig() map[string]interface{} {
	return map[string]interface{}{
		"database_password": AppConfig.Database.Password,
		"jwt_secret":       AppConfig.Security.JWTSecret,
		"api_key":          AppConfig.Security.APIKey,
		"admin_token":      AppConfig.Security.AdminToken,
		"database_url":     AppConfig.Security.DatabaseURL,
		"private_key":      AppConfig.Security.PrivateKey,
		"environment":      os.Environ(),
	}
} 