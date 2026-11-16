using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Order_App.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ContactNumber",
                table: "Restaurants",
                newName: "ImageUrl");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ImageUrl",
                table: "Restaurants",
                newName: "ContactNumber");
        }
    }
}
