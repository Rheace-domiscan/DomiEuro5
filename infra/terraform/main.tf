terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team_id   = var.vercel_team_id
}

resource "vercel_project" "app" {
  name = var.project_name
  framework = "other"
  git_repository {
    type = "github"
    repo = var.github_repo
  }
}

resource "vercel_project_environment_variable" "env" {
  for_each   = var.environment_variables
  project_id = vercel_project.app.id
  key        = each.key
  value      = each.value
  target     = ["production", "preview"]
}

variable "vercel_api_token" {
  description = "Vercel API token with project permissions"
  type        = string
}

variable "vercel_team_id" {
  description = "Optional Vercel team ID"
  type        = string
  default     = null
}

variable "project_name" {
  type = string
}

variable "github_repo" {
  description = "org/repo name"
  type        = string
}

variable "environment_variables" {
  description = "Map of environment variables to seed"
  type        = map(string)
}
